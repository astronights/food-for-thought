import { NextRequest, NextResponse } from "next/server";
import { estimateNutrition, estimateNutritionFromText, estimateBYOIngredients, type GroupContext, type GroupWithOptions } from "@/lib/gemini";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const orderDescription = formData.get("order_description") as string;
    const dishName = formData.get("dish_name") as string;
    const restaurantId = formData.get("restaurant_id") as string;
    const menuItemId = formData.get("menu_item_id") as string | null;
    const sessionId = formData.get("session_id") as string;
    const isCorrectionFlag = formData.get("is_correction_flag") === "true";

    if (!orderDescription || !restaurantId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── Correction flag: text-only Gemini extraction, no image ───────────────
    if (isCorrectionFlag) {
      // Fetch current group rules to give Gemini context for rule suggestions
      let groups: GroupContext[] = [];
      if (menuItemId) {
        const [{ data: itemGroups }, { data: restaurantGroups }] = await Promise.all([
          getSupabaseAdmin().from("customisation_groups").select("name,ui_hint,min_selections,max_selections").eq("menu_item_id", menuItemId),
          getSupabaseAdmin().from("customisation_groups").select("name,ui_hint,min_selections,max_selections")
            .eq("restaurant_id", restaurantId).is("menu_item_id", null),
        ]);
        groups = [...(itemGroups ?? []), ...(restaurantGroups ?? [])] as GroupContext[];
      }

      const nutrition = await estimateNutritionFromText(orderDescription, groups);
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
        ai_group_suggestions: nutrition.rule_suggestions?.length ? nutrition.rule_suggestions : null,
        is_correction_flag: true,
        image_processed: false,
        submitter_session_id: sessionId,
      });
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // ── Full nutrition submission: at least one image required ────────────────
    const imageFiles = formData.getAll("images") as File[];
    const validImages = imageFiles.filter((f) => f && f.size > 0).slice(0, 3);

    if (validImages.length === 0) {
      return NextResponse.json({ error: "At least one image is required" }, { status: 400 });
    }

    const processed = await Promise.all(
      validImages.map(async (file) => {
        const buf = Buffer.from(await file.arrayBuffer());
        const ext = file.type.split("/")[1] ?? "jpg";
        const path = `dish-submissions/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        return { buf, mimeType: file.type, base64: buf.toString("base64"), path };
      })
    );

    // Check if this is a BYO menu item — if so, extract per-ingredient deltas
    let isBYO = false;
    let byoGroups: GroupWithOptions[] = [];
    const optionIdLookup: Record<string, string> = {};

    if (menuItemId) {
      const { data: menuItem } = await getSupabaseAdmin()
        .from("menu_items")
        .select("has_customisation")
        .eq("id", menuItemId)
        .single();

      if (menuItem?.has_customisation) {
        const [{ data: itemGroups }, { data: restGroups }] = await Promise.all([
          getSupabaseAdmin()
            .from("customisation_groups")
            .select("name, ui_hint, customisation_options(id, name)")
            .eq("menu_item_id", menuItemId),
          getSupabaseAdmin()
            .from("customisation_groups")
            .select("name, ui_hint, customisation_options(id, name)")
            .eq("restaurant_id", restaurantId)
            .is("menu_item_id", null),
        ]);
        const allGroups = [...(itemGroups ?? []), ...(restGroups ?? [])];
        if (allGroups.length > 0) {
          isBYO = true;
          byoGroups = allGroups.map((g) => ({
            name: g.name,
            ui_hint: g.ui_hint,
            options: (g.customisation_options as { id: string; name: string }[]).map((o) => o.name),
          }));
          // Build name→id lookup so Gemini's returned names can be resolved to option IDs.
          // Strip parentheticals from group names (e.g. "Base (Choose 1)" → "base") to match
          // what Gemini returns after seeing the cleaned prompt.
          const norm = (s: string) => s.trim().toLowerCase();
          const normGroup = (s: string) => s.replace(/\s*\(.*?\)/g, "").trim().toLowerCase();
          for (const g of allGroups) {
            const gKey = normGroup(g.name);
            for (const o of (g.customisation_options as { id: string; name: string }[])) {
              optionIdLookup[`${gKey}|||${norm(o.name)}`] = o.id;
            }
          }
        }
      }
    }

    const imageInputs = processed.map((p) => ({ base64: p.base64, mimeType: p.mimeType }));

    const [extractionResult, ...uploadResults] = await Promise.all([
      isBYO
        ? estimateBYOIngredients(imageInputs, orderDescription, byoGroups)
        : estimateNutrition(imageInputs, orderDescription),
      ...processed.map((p) =>
        getSupabaseAdmin().storage.from("submission-images").upload(p.path, p.buf, { contentType: p.mimeType })
      ),
    ]);

    const storedPaths = uploadResults
      .map((r, i) => (r.error ? null : processed[i].path))
      .filter(Boolean) as string[];

    const baseRecord = {
      restaurant_id: restaurantId,
      menu_item_id: menuItemId || null,
      dish_name_raw: dishName,
      order_description: orderDescription,
      is_correction_flag: false,
      submitter_session_id: sessionId,
      image_processed: true,
      image_path: storedPaths[0] ?? null,
      image_paths: storedPaths,
    };

    const nutritionRecord = isBYO
      ? (() => {
          const byo = extractionResult as import("@/lib/gemini").BYONutritionEstimate;
          const normGroup = (s: string) => s.replace(/\s*\(.*?\)/g, "").trim().toLowerCase();
          const norm = (s: string) => s.trim().toLowerCase();
          const ingredientsWithIds = byo.ingredients.map((d) => ({
            ...d,
            option_id: optionIdLookup[`${normGroup(d.group_name)}|||${norm(d.option_name)}`] ?? null,
          }));
          return {
            ai_confidence: byo.total_confidence,
            ai_notes: byo.notes,
            ai_ingredient_deltas: ingredientsWithIds,
          };
        })()
      : (() => {
          const n = extractionResult as import("@/lib/gemini").NutritionEstimate;
          return {
            ai_calories: n.calories,
            ai_protein_g: n.protein_g,
            ai_carbs_g: n.carbs_g,
            ai_fat_g: n.fat_g,
            ai_fibre_g: n.fibre_g,
            ai_sugar_g: n.sugar_g,
            ai_sat_fat_g: n.sat_fat_g,
            ai_sodium_mg: n.sodium_mg,
            ai_confidence: n.confidence,
            ai_notes: n.notes,
            ai_price_sgd: n.price_sgd || null,
            ai_weight_g: n.weight_g || null,
          };
        })();

    const { error } = await getSupabaseAdmin().from("crowdsource_submissions").insert({
      ...baseRecord,
      ...nutritionRecord,
    });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Dish submission error:", err);
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
