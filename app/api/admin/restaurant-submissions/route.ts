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
  const { submission_id, name, slug, cuisine_tags, location_tags, tier } = body;

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

  const dishes = submission?.ai_extracted_dishes as { name: string; category: string | null }[] | null;
  if (dishes && dishes.length > 0) {
    const stubs = dishes.map((d, i) => ({
      restaurant_id: restaurant.id,
      name: d.name,
      category: d.category ?? "Menu",
      has_customisation: false,
      is_available: true,
      data_source: "crowdsourced" as const,
      display_order: i,
    }));
    await getSupabaseAdmin().from("menu_items").insert(stubs);
  }

  await getSupabaseAdmin()
    .from("restaurant_submissions")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", submission_id);

  return NextResponse.json({ success: true, restaurant });
}
