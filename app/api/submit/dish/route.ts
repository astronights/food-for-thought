import { NextRequest, NextResponse } from "next/server";
import { estimateNutrition } from "@/lib/gemini";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const orderDescription = formData.get("order_description") as string;
    const dishName = formData.get("dish_name") as string;
    const restaurantId = formData.get("restaurant_id") as string;
    const menuItemId = formData.get("menu_item_id") as string | null;
    const sessionId = formData.get("session_id") as string;

    if (!image || !orderDescription || !restaurantId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64Image = buffer.toString("base64");
    const mimeType = image.type;

    const nutrition = await estimateNutrition(base64Image, mimeType, orderDescription);

    const { error } = await getSupabaseAdmin().from("crowdsource_submissions").insert({
      restaurant_id: restaurantId,
      menu_item_id: menuItemId || null,
      dish_name_raw: dishName,
      order_description: orderDescription,
      ai_calories: nutrition.calories,
      ai_protein_g: nutrition.protein_g,
      ai_carbs_g: nutrition.carbs_g,
      ai_fat_g: nutrition.fat_g,
      ai_fibre_g: nutrition.fibre_g,
      ai_sugar_g: nutrition.sugar_g,
      ai_sat_fat_g: nutrition.sat_fat_g,
      ai_sodium_mg: nutrition.sodium_mg,
      ai_confidence: nutrition.confidence,
      ai_notes: nutrition.notes,
      submitter_session_id: sessionId,
      image_processed: true,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Dish submission error:", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
