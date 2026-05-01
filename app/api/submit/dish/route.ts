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
    const isCorrectionFlag = formData.get("is_correction_flag") === "true";

    if (!orderDescription || !restaurantId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── Correction flag: no image, no Gemini call ─────────────────────────────
    if (isCorrectionFlag) {
      const { error } = await getSupabaseAdmin().from("crowdsource_submissions").insert({
        restaurant_id: restaurantId,
        menu_item_id: menuItemId || null,
        dish_name_raw: dishName,
        order_description: orderDescription,
        is_correction_flag: true,
        image_processed: false,
        submitter_session_id: sessionId,
      });
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ── Full nutrition submission: image required ──────────────────────────────
    if (!image || image.size === 0) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64Image = buffer.toString("base64");
    const mimeType = image.type;

    const ext = mimeType.split("/")[1] ?? "jpg";
    const imagePath = `dish-submissions/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const [nutrition, uploadResult] = await Promise.all([
      estimateNutrition(base64Image, mimeType, orderDescription),
      getSupabaseAdmin().storage.from("submission-images").upload(imagePath, buffer, { contentType: mimeType }),
    ]);

    const storedImagePath = uploadResult.error ? null : imagePath;

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
      ai_price_sgd: nutrition.price_sgd || null,
      ai_weight_g: nutrition.weight_g || null,
      is_correction_flag: false,
      submitter_session_id: sessionId,
      image_processed: true,
      image_path: storedImagePath,
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Dish submission error:", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
