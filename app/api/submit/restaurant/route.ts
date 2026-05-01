import { NextRequest, NextResponse } from "next/server";
import { readMenu } from "@/lib/gemini";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const restaurantName = formData.get("restaurant_name") as string;
    const locationDescription = formData.get("location_description") as string;
    const cuisineDescription = formData.get("cuisine_description") as string;
    const sessionId = formData.get("session_id") as string;

    if (!restaurantName) {
      return NextResponse.json({ error: "Restaurant name is required" }, { status: 400 });
    }

    let menuExtract = null;
    let aiNotes = null;
    let storedImagePath: string | null = null;

    if (image && image.size > 0) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const base64Image = buffer.toString("base64");
      const mimeType = image.type;
      const ext = mimeType.split("/")[1] ?? "jpg";
      const imagePath = `menus/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const [menuData, uploadResult] = await Promise.all([
        readMenu(base64Image, mimeType),
        getSupabaseAdmin().storage.from("submission-images").upload(imagePath, buffer, { contentType: mimeType }),
      ]);

      menuExtract = menuData;
      aiNotes = menuData.notes;
      storedImagePath = uploadResult.error ? null : imagePath;
    }

    const { error } = await getSupabaseAdmin().from("restaurant_submissions").insert({
      restaurant_name: restaurantName,
      location_description: locationDescription || null,
      cuisine_description: cuisineDescription || null,
      ai_extracted_dishes: menuExtract,
      ai_notes: aiNotes,
      submitter_session_id: sessionId,
      image_processed: !!menuExtract,
      image_path: storedImagePath,
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Restaurant submission error:", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
