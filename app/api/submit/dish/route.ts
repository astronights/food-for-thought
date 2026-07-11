import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import {
  estimateNutrition,
  estimateNutritionFromText,
  estimateBYOIngredients,
  type GroupContext,
  type GroupWithOptions,
  type BYONutritionEstimate,
  type NutritionEstimate,
} from "@/lib/gemini";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const orderDescription = formData.get("order_description") as string;
    const dishName = formData.get("dish_name") as string;
    const restaurantId = formData.get("restaurant_id") as string;
    const menuItemId = formData.get("menu_item_id") as string | null;
    const sessionId = formData.get("session_id") as string;
    const isCorrectionFlag =
      formData.get("is_correction_flag") === "true";

    if (!orderDescription || !restaurantId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Correction flag: text-only Gemini extraction, no image
    if (isCorrectionFlag) {
      let groups: GroupContext[] = [];

      if (menuItemId) {
        const groupRows = await sql`
          SELECT
            name,
            ui_hint,
            min_selections,
            max_selections
          FROM customisation_groups
          WHERE menu_item_id = ${menuItemId}
             OR (
               restaurant_id = ${restaurantId}
               AND menu_item_id IS NULL
             )
        `;

        groups = groupRows as GroupContext[];
      }

      const nutrition = await estimateNutritionFromText(
        orderDescription,
        groups
      );

      await sql`
        INSERT INTO crowdsource_submissions (
          restaurant_id,
          menu_item_id,
          dish_name_raw,
          order_description,
          ai_calories,
          ai_protein_g,
          ai_carbs_g,
          ai_fat_g,
          ai_fibre_g,
          ai_sugar_g,
          ai_sat_fat_g,
          ai_sodium_mg,
          ai_confidence,
          ai_notes,
          ai_price_sgd,
          ai_weight_g,
          ai_group_suggestions,
          is_correction_flag,
          image_processed,
          submitter_session_id
        )
        VALUES (
          ${restaurantId},
          ${menuItemId || null},
          ${dishName},
          ${orderDescription},
          ${nutrition.calories},
          ${nutrition.protein_g},
          ${nutrition.carbs_g},
          ${nutrition.fat_g},
          ${nutrition.fibre_g},
          ${nutrition.sugar_g},
          ${nutrition.sat_fat_g},
          ${nutrition.sodium_mg},
          ${nutrition.confidence},
          ${nutrition.notes},
          ${nutrition.price_sgd || null},
          ${nutrition.weight_g || null},
          ${
            nutrition.rule_suggestions?.length
              ? JSON.stringify(nutrition.rule_suggestions)
              : null
          }::jsonb,
          true,
          false,
          ${sessionId}
        )
      `;

      return NextResponse.json({ success: true });
    }

    // Full submission requires at least one image
    const imageFiles = formData.getAll("images") as File[];

    const validImages = imageFiles
      .filter((file) => file && file.size > 0)
      .slice(0, 3);

    if (validImages.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 }
      );
    }

    const processed = await Promise.all(
      validImages.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const ext = file.type.split("/")[1] ?? "jpg";

        const path =
          `dish-submissions/${Date.now()}-` +
          `${Math.random().toString(36).slice(2)}.${ext}`;

        return {
          buf,
          mimeType: file.type,
          base64: buf.toString("base64"),
          path,
        };
      })
    );

    let isBYO = false;
    let byoGroups: GroupWithOptions[] = [];

    const optionIdLookup: Record<string, string> = {};

    if (menuItemId) {
      const menuItemRows = await sql`
        SELECT has_customisation
        FROM menu_items
        WHERE id = ${menuItemId}
        LIMIT 1
      `;

      const menuItem = menuItemRows[0] as
        | { has_customisation: boolean }
        | undefined;

      if (menuItem?.has_customisation) {
        const groupRows = await sql`
          SELECT id, name, ui_hint
          FROM customisation_groups
          WHERE menu_item_id = ${menuItemId}
             OR (
               restaurant_id = ${restaurantId}
               AND menu_item_id IS NULL
             )
        `;

        const groupIds = groupRows.map(
          (group) => group.id as string
        );

        const optionRows =
          groupIds.length > 0
            ? await sql`
                SELECT id, group_id, name
                FROM customisation_options
                WHERE group_id = ANY(${groupIds})
              `
            : [];

        if (groupRows.length > 0) {
          isBYO = true;

          byoGroups = groupRows.map((group) => {
            const options = optionRows.filter(
              (option) => option.group_id === group.id
            );

            return {
              name: group.name as string,
              ui_hint: group.ui_hint as string,
              options: options.map(
                (option) => option.name as string
              ),
            };
          });

          const norm = (value: string) =>
            value.trim().toLowerCase();

          const normGroup = (value: string) =>
            value
              .replace(/\s*\(.*?\)/g, "")
              .trim()
              .toLowerCase();

          for (const group of groupRows) {
            const groupKey = normGroup(group.name as string);

            const options = optionRows.filter(
              (option) => option.group_id === group.id
            );

            for (const option of options) {
              optionIdLookup[
                `${groupKey}|||${norm(option.name as string)}`
              ] = option.id as string;
            }
          }
        }
      }
    }

    const imageInputs = processed.map((item) => ({
      base64: item.base64,
      mimeType: item.mimeType,
    }));

    const extractionPromise = isBYO
      ? estimateBYOIngredients(
          imageInputs,
          orderDescription,
          byoGroups
        )
      : estimateNutrition(imageInputs, orderDescription);

    const uploadPromises = processed.map((item) =>
      put(item.path, item.buf, {
        access: "private",
        contentType: item.mimeType,
        addRandomSuffix: false,
      })
    );

    const [extractionResult, uploads] = await Promise.all([
      extractionPromise,
      Promise.all(uploadPromises),
    ]);

    const storedPaths = uploads.map(
      (blob) => blob.pathname
    );

    if (isBYO) {
      const byo = extractionResult as BYONutritionEstimate;

      const norm = (value: string) =>
        value.trim().toLowerCase();

      const normGroup = (value: string) =>
        value
          .replace(/\s*\(.*?\)/g, "")
          .trim()
          .toLowerCase();

      const ingredientsWithIds = byo.ingredients.map(
        (ingredient) => ({
          ...ingredient,
          option_id:
            optionIdLookup[
              `${normGroup(ingredient.group_name)}|||${norm(
                ingredient.option_name
              )}`
            ] ?? null,
        })
      );

      await sql`
        INSERT INTO crowdsource_submissions (
          restaurant_id,
          menu_item_id,
          dish_name_raw,
          order_description,
          is_correction_flag,
          submitter_session_id,
          image_processed,
          image_path,
          image_paths,
          ai_confidence,
          ai_notes,
          ai_ingredient_deltas
        )
        VALUES (
          ${restaurantId},
          ${menuItemId || null},
          ${dishName},
          ${orderDescription},
          false,
          ${sessionId},
          true,
          ${storedPaths[0] ?? null},
          ${storedPaths},
          ${byo.total_confidence},
          ${byo.notes},
          ${JSON.stringify(ingredientsWithIds)}::jsonb
        )
      `;
    } else {
      const nutrition = extractionResult as NutritionEstimate;

      await sql`
        INSERT INTO crowdsource_submissions (
          restaurant_id,
          menu_item_id,
          dish_name_raw,
          order_description,
          is_correction_flag,
          submitter_session_id,
          image_processed,
          image_path,
          image_paths,
          ai_calories,
          ai_protein_g,
          ai_carbs_g,
          ai_fat_g,
          ai_fibre_g,
          ai_sugar_g,
          ai_sat_fat_g,
          ai_sodium_mg,
          ai_confidence,
          ai_notes,
          ai_price_sgd,
          ai_weight_g
        )
        VALUES (
          ${restaurantId},
          ${menuItemId || null},
          ${dishName},
          ${orderDescription},
          false,
          ${sessionId},
          true,
          ${storedPaths[0] ?? null},
          ${storedPaths},
          ${nutrition.calories},
          ${nutrition.protein_g},
          ${nutrition.carbs_g},
          ${nutrition.fat_g},
          ${nutrition.fibre_g},
          ${nutrition.sugar_g},
          ${nutrition.sat_fat_g},
          ${nutrition.sodium_mg},
          ${nutrition.confidence},
          ${nutrition.notes},
          ${nutrition.price_sgd || null},
          ${nutrition.weight_g || null}
        )
      `;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Dish submission error:", err);

    return NextResponse.json(
      { error: "Submission failed" },
      { status: 500 }
    );
  }
}