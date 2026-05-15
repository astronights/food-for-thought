import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("crowdsource_submissions")
    .select("*, restaurants(name, slug)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

type IngredientDeltaRow = {
  group_name: string; option_name: string;
  calories_delta: number; protein_delta_g: number; carbs_delta_g: number;
  fat_delta_g: number; fibre_delta_g: number; sugar_delta_g: number;
  sat_fat_delta_g: number; sodium_delta_mg: number;
};

function mean(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, status, admin_notes, admin_calories, admin_protein_g, admin_carbs_g, admin_fat_g, admin_sodium_mg, ingredient_deltas } = body;

  const supabase = getSupabaseAdmin();
  const isBYOApproval = status === "approved" && Array.isArray(ingredient_deltas) && ingredient_deltas.length > 0;

  // Persist admin-edited deltas back so they contribute to the running average
  const { error } = await supabase
    .from("crowdsource_submissions")
    .update({
      status, admin_notes,
      admin_calories, admin_protein_g, admin_carbs_g, admin_fat_g, admin_sodium_mg,
      ...(isBYOApproval ? { ai_ingredient_deltas: ingredient_deltas } : {}),
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (isBYOApproval) {
    const { data: submission } = await supabase
      .from("crowdsource_submissions")
      .select("restaurant_id, menu_item_id")
      .eq("id", id)
      .single();

    if (submission?.restaurant_id) {
      // Average deltas across ALL approved BYO submissions for this restaurant
      const { data: allApproved } = await supabase
        .from("crowdsource_submissions")
        .select("ai_ingredient_deltas")
        .eq("restaurant_id", submission.restaurant_id)
        .eq("status", "approved")
        .not("ai_ingredient_deltas", "is", null);

      // Aggregate per group+option
      const agg: Record<string, Record<string, {
        cal: number[]; prot: number[]; carbs: number[]; fat: number[];
        fibre: number[]; sugar: number[]; sat_fat: number[]; sodium: number[];
      }>> = {};

      for (const sub of allApproved ?? []) {
        for (const d of (sub.ai_ingredient_deltas as IngredientDeltaRow[])) {
          if (!agg[d.group_name]) agg[d.group_name] = {};
          if (!agg[d.group_name][d.option_name]) {
            agg[d.group_name][d.option_name] = { cal: [], prot: [], carbs: [], fat: [], fibre: [], sugar: [], sat_fat: [], sodium: [] };
          }
          const a = agg[d.group_name][d.option_name];
          a.cal.push(d.calories_delta);
          a.prot.push(d.protein_delta_g);
          a.carbs.push(d.carbs_delta_g);
          a.fat.push(d.fat_delta_g);
          a.fibre.push(d.fibre_delta_g);
          a.sugar.push(d.sugar_delta_g);
          a.sat_fat.push(d.sat_fat_delta_g);
          a.sodium.push(d.sodium_delta_mg);
        }
      }

      // Build lookup: normalised(groupName) → normalised(optionName) → optionId
      const { data: groups } = await supabase
        .from("customisation_groups")
        .select("id, name, customisation_options(id, name)")
        .eq("restaurant_id", submission.restaurant_id);

      const norm = (s: string) => s.trim().toLowerCase();
      const lookup: Record<string, Record<string, string>> = {};
      for (const g of groups ?? []) {
        lookup[norm(g.name)] = {};
        for (const o of (g.customisation_options as { id: string; name: string }[])) {
          lookup[norm(g.name)][norm(o.name)] = o.id;
        }
      }

      // Write averaged values to customisation_options
      await Promise.all(
        Object.entries(agg).flatMap(([groupName, options]) =>
          Object.entries(options).map(([optionName, a]) => {
            const optionId = lookup[norm(groupName)]?.[norm(optionName)];
            if (!optionId) return Promise.resolve();
            return supabase.from("customisation_options").update({
              calories_delta:  Math.round(mean(a.cal)),
              protein_delta_g: Math.round(mean(a.prot)    * 10) / 10,
              carbs_delta_g:   Math.round(mean(a.carbs)   * 10) / 10,
              fat_delta_g:     Math.round(mean(a.fat)     * 10) / 10,
              fibre_delta_g:   Math.round(mean(a.fibre)   * 10) / 10,
              sugar_delta_g:   Math.round(mean(a.sugar)   * 10) / 10,
              sat_fat_delta_g: Math.round(mean(a.sat_fat) * 10) / 10,
              sodium_delta_mg: Math.round(mean(a.sodium)),
            }).eq("id", optionId);
          })
        )
      );

      // Promote restaurant from "no data" (tier 3) to "community estimate" (tier 2)
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("slug")
        .eq("id", submission.restaurant_id)
        .eq("tier", 3)
        .single();

      if (restaurant?.slug) {
        await supabase.from("restaurants").update({ tier: 2 }).eq("id", submission.restaurant_id);
      }

      // Always revalidate — regardless of tier, the builder page needs fresh delta values
      const { data: anyRestaurant } = await supabase
        .from("restaurants")
        .select("slug")
        .eq("id", submission.restaurant_id)
        .single();

      if (anyRestaurant?.slug) {
        revalidatePath(`/restaurants/${anyRestaurant.slug}`);
        if (submission.menu_item_id) {
          revalidatePath(`/restaurants/${anyRestaurant.slug}/build/${submission.menu_item_id}`);
        }
        revalidatePath("/");
      }
    }
  }

  return NextResponse.json({ success: true });
}
