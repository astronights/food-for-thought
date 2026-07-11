import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { readMenu, type MenuExtract } from "@/lib/gemini";
import { sql } from "@/lib/db";

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function titleCaseExtract(extract: MenuExtract): MenuExtract {
  return {
    ...extract,
    restaurant_name: extract.restaurant_name
      ? toTitleCase(extract.restaurant_name)
      : extract.restaurant_name,
    dishes: extract.dishes.map((d) => ({
      ...d,
      name: toTitleCase(d.name),
      category: toTitleCase(d.category),
    })),
    customisation_groups: extract.customisation_groups.map((g) => ({
      ...g,
      name: toTitleCase(g.name),
      options: g.options.map((o) => ({
        ...o,
        name: toTitleCase(o.name),
      })),
    })),
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const restaurantName = formData.get("restaurant_name") as string;
    const locationDescription = formData.get(
      "location_description"
    ) as string;
    const cuisineDescription = formData.get(
      "cuisine_description"
    ) as string;
    const submitterNotes =
      (formData.get("notes") as string | null) ?? "";
    const sessionId = formData.get("session_id") as string;

    if (!restaurantName) {
      return NextResponse.json(
        { error: "Restaurant name is required" },
        { status: 400 }
      );
    }

    let menuExtract: MenuExtract | null = null;
    let aiNotes: string | null = null;
    let storedPaths: string[] = [];

    const imageFiles = (
      formData.getAll("images") as File[]
    )
      .filter((file) => file && file.size > 0)
      .slice(0, 3);

    if (imageFiles.length > 0) {
      const processed = await Promise.all(
        imageFiles.map(async (file) => {
          const buf = Buffer.from(await file.arrayBuffer());
          const ext = file.type.split("/")[1] ?? "jpg";
          const path =
            `menus/${Date.now()}-` +
            `${Math.random().toString(36).slice(2)}.${ext}`;

          return {
            buf,
            mimeType: file.type,
            base64: buf.toString("base64"),
            path,
          };
        })
      );

      const menuData = await readMenu(
        processed.map((item) => ({
          base64: item.base64,
          mimeType: item.mimeType,
        })),
        submitterNotes
      );

      menuExtract = titleCaseExtract(menuData);
      aiNotes = menuData.notes;

      const uploads = await Promise.all(
        processed.map((item) =>
          put(item.path, item.buf, {
            access: "private",
            contentType: item.mimeType,
            addRandomSuffix: false,
          })
        )
      );

      storedPaths = uploads.map((blob) => blob.pathname);
    }

    await sql`
      INSERT INTO restaurant_submissions (
        restaurant_name,
        location_description,
        cuisine_description,
        ai_extracted_dishes,
        ai_notes,
        submitter_notes,
        submitter_session_id,
        image_processed,
        image_path,
        image_paths
      )
      VALUES (
        ${restaurantName},
        ${locationDescription || null},
        ${cuisineDescription || null},
        ${menuExtract ? JSON.stringify(menuExtract) : null}::jsonb,
        ${aiNotes},
        ${submitterNotes || null},
        ${sessionId},
        ${!!menuExtract},
        ${storedPaths[0] ?? null},
        ${storedPaths},
        ${storedPaths}
      )
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Restaurant submission error:", err);

    return NextResponse.json(
      { error: "Submission failed" },
      { status: 500 }
    );
  }
}