import { NextRequest, NextResponse } from "next/server";
import { readMenu } from "@/lib/gemini";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const restaurantName = formData.get("restaurant_name") as string;
    const locationDescription = formData.get("location_description") as string;
    const cuisineDescription = formData.get("cuisine_description") as string;
    const sessionId = formData.get("session_id") as string;

    if (!restaurantName) {
      return NextResponse.json({ error: "Restaurant name is required" }, { status: 400 });
    }

    let menuExtract = null;
    let aiNotes = null;
    let storedPaths: string[] = [];

    const imageFiles = (formData.getAll("images") as File[]).filter((f) => f && f.size > 0).slice(0, 3);

    if (imageFiles.length > 0) {
      const processed = await Promise.all(
        imageFiles.map(async (file) => {
          const buf = Buffer.from(await file.arrayBuffer());
          const ext = file.type.split("/")[1] ?? "jpg";
          const path = `menus/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          return { buf, mimeType: file.type, base64: buf.toString("base64"), path };
        })
      );

      const [menuData, ...uploadResults] = await Promise.all([
        readMenu(processed.map((p) => ({ base64: p.base64, mimeType: p.mimeType }))),
        ...processed.map((p) =>
          getSupabaseAdmin().storage.from("submission-images").upload(p.path, p.buf, { contentType: p.mimeType })
        ),
      ]);

      menuExtract = menuData;
      aiNotes = menuData.notes;
      storedPaths = uploadResults
        .map((r, i) => (r.error ? null : processed[i].path))
        .filter(Boolean) as string[];
    }

    const { error } = await getSupabaseAdmin().from("restaurant_submissions").insert({
      restaurant_name: restaurantName,
      location_description: locationDescription || null,
      cuisine_description: cuisineDescription || null,
      ai_extracted_dishes: menuExtract,
      ai_notes: aiNotes,
      submitter_session_id: sessionId,
      image_processed: !!menuExtract,
      image_path: storedPaths[0] ?? null,
      image_paths: storedPaths,
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Restaurant submission error:", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
