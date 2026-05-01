import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("restaurant_submissions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, status, admin_notes } = body;

  const { error } = await getSupabaseAdmin()
    .from("restaurant_submissions")
    .update({ status, admin_notes, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { submission_id, name, slug, cuisine_tags, location_tags, tier, edited_dishes, edited_groups } = body;

  const { data: restaurant, error: rErr } = await getSupabaseAdmin()
    .from("restaurants")
    .insert({ name, slug, cuisine_tags, location_tags, tier: tier ?? 3 })
    .select()
    .single();

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const { data: submission } = await getSupabaseAdmin()
    .from("restaurant_submissions")
    .select("ai_extracted_dishes")
    .eq("id", submission_id)
    .single();

  // ai_extracted_dishes may be the full MenuExtract object or a legacy dishes array
  const extract = submission?.ai_extracted_dishes as Record<string, unknown> | null;
  const isBuildYourOwn =
    extract && !Array.isArray(extract) && extract.menu_type === "build_your_own";

  if (isBuildYourOwn) {
    // Create a single customisable menu item then seed its groups + options
    const { data: menuItem } = await getSupabaseAdmin()
      .from("menu_items")
      .insert({
        restaurant_id: restaurant.id,
        name: "Build Your Own",
        description: extract.meal_structure as string || null,
        category: "Customise",
        base_calories: 0, base_protein_g: 0, base_carbs_g: 0,
        base_fat_g: 0, base_fibre_g: 0, base_sugar_g: 0,
        base_sat_fat_g: 0, base_sodium_mg: 0,
        has_customisation: true,
        is_available: true,
        data_source: "crowdsourced",
        display_order: 0,
      })
      .select()
      .single();

    if (menuItem) {
      // Prefer admin-edited groups if provided
      const groups = (edited_groups ?? extract.customisation_groups) as {
        name: string; ui_hint: string; max_selections: number;
        options: { name: string; price_delta_sgd: number }[];
      }[];

      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        const { data: group } = await getSupabaseAdmin()
          .from("customisation_groups")
          .insert({
            menu_item_id: menuItem.id,
            restaurant_id: restaurant.id,
            name: g.name,
            ui_hint: g.ui_hint,
            min_selections: g.ui_hint === "pick_one_required" ? 1 : 0,
            max_selections: g.max_selections || null,
            display_order: gi,
          })
          .select()
          .single();

        if (group && g.options?.length) {
          await getSupabaseAdmin().from("customisation_options").insert(
            g.options.map((o, oi) => ({
              group_id: group.id,
              name: o.name,
              price_delta_sgd: o.price_delta_sgd || null,
              display_order: oi,
            }))
          );
        }
      }
    }
  } else {
    // Regular menu — seed dish stubs
    // Prefer admin-edited dish list if provided, otherwise fall back to AI extract
    const dishes: { name: string; category: string | null }[] = edited_dishes?.length
      ? edited_dishes
      : Array.isArray(extract)
        ? extract
        : ((extract?.dishes as { name: string; category: string | null }[]) ?? []);

    if (dishes.length > 0) {
      await getSupabaseAdmin().from("menu_items").insert(
        dishes.map((d, i) => ({
          restaurant_id: restaurant.id,
          name: d.name,
          category: d.category ?? "Menu",
          has_customisation: false,
          is_available: true,
          data_source: "crowdsourced" as const,
          display_order: i,
        }))
      );
    }
  }

  await getSupabaseAdmin()
    .from("restaurant_submissions")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", submission_id);

  return NextResponse.json({ success: true, restaurant, is_build_your_own: isBuildYourOwn });
}
