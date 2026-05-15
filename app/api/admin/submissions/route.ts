import { NextRequest, NextResponse } from "next/server";
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

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, status, admin_notes, admin_calories, admin_protein_g, admin_carbs_g, admin_fat_g, admin_sodium_mg, ingredient_deltas } = body;

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from("crowdsource_submissions")
    .update({ status, admin_notes, admin_calories, admin_protein_g, admin_carbs_g, admin_fat_g, admin_sodium_mg, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For BYO approvals, write ingredient deltas back to customisation_options
  if (status === "approved" && Array.isArray(ingredient_deltas) && ingredient_deltas.length > 0) {
    const { data: submission } = await supabase
      .from("crowdsource_submissions")
      .select("restaurant_id")
      .eq("id", id)
      .single();

    if (submission?.restaurant_id) {
      const { data: groups } = await supabase
        .from("customisation_groups")
        .select("id, name, customisation_options(id, name)")
        .eq("restaurant_id", submission.restaurant_id);

      // Build lookup: groupName → optionName → optionId
      const lookup: Record<string, Record<string, string>> = {};
      for (const g of groups ?? []) {
        lookup[g.name] = {};
        for (const o of (g.customisation_options as { id: string; name: string }[])) {
          lookup[g.name][o.name] = o.id;
        }
      }

      await Promise.all(
        ingredient_deltas.map((delta: {
          group_name: string; option_name: string;
          calories_delta: number; protein_delta_g: number; carbs_delta_g: number;
          fat_delta_g: number; fibre_delta_g: number; sugar_delta_g: number;
          sat_fat_delta_g: number; sodium_delta_mg: number;
        }) => {
          const optionId = lookup[delta.group_name]?.[delta.option_name];
          if (!optionId) return Promise.resolve();
          return supabase.from("customisation_options").update({
            calories_delta:  delta.calories_delta,
            protein_delta_g: delta.protein_delta_g,
            carbs_delta_g:   delta.carbs_delta_g,
            fat_delta_g:     delta.fat_delta_g,
            fibre_delta_g:   delta.fibre_delta_g,
            sugar_delta_g:   delta.sugar_delta_g,
            sat_fat_delta_g: delta.sat_fat_delta_g,
            sodium_delta_mg: delta.sodium_delta_mg,
          }).eq("id", optionId);
        })
      );
    }
  }

  return NextResponse.json({ success: true });
}
