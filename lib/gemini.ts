import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = "gemini-2.5-flash-lite";

// ─── Nutrition estimation ─────────────────────────────────────────────────────

const NUTRITION_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    calories:    { type: SchemaType.INTEGER, description: "Total calories in kcal" },
    protein_g:   { type: SchemaType.NUMBER,  description: "Protein in grams (1 decimal)" },
    carbs_g:     { type: SchemaType.NUMBER,  description: "Total carbohydrates in grams" },
    fat_g:       { type: SchemaType.NUMBER,  description: "Total fat in grams" },
    fibre_g:     { type: SchemaType.NUMBER,  description: "Dietary fibre in grams" },
    sugar_g:     { type: SchemaType.NUMBER,  description: "Sugar in grams" },
    sat_fat_g:   { type: SchemaType.NUMBER,  description: "Saturated fat in grams" },
    sodium_mg:   { type: SchemaType.INTEGER, description: "Sodium in milligrams" },
    confidence:  { type: SchemaType.NUMBER,  description: "Confidence score 0.0 to 1.0" },
    notes:       { type: SchemaType.STRING,  description: "Brief explanation of assumptions and portion estimate" },
    price_sgd:   { type: SchemaType.NUMBER,  description: "Price in SGD if the user mentioned it in their description, otherwise 0" },
    weight_g:    { type: SchemaType.INTEGER, description: "Estimated total serving weight in grams based on the portion visible" },
  },
  required: ["calories", "protein_g", "carbs_g", "fat_g", "fibre_g", "sugar_g", "sat_fat_g", "sodium_mg", "confidence", "notes", "price_sgd", "weight_g"],
};

const NUTRITION_PROMPT = `You are a nutrition estimation assistant specialising in Singapore food.
Given a photo of a meal and a text description of what was ordered, estimate the nutritional content.
Base estimates on standard Singapore portion sizes. Lower confidence if the image is unclear.
If the user mentions a price in their description, extract it as price_sgd. If not mentioned, use 0.
Estimate the total serving weight in grams from the portion visible in the photo.`;

export interface RuleSuggestion {
  group_name: string;
  field: "min_selections" | "max_selections";
  current_value: number;   // -1 = currently null/unlimited
  suggested_value: number; // -1 = suggest unlimited
  reason: string;
}

export interface NutritionEstimate {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  sugar_g: number;
  sat_fat_g: number;
  sodium_mg: number;
  confidence: number;
  notes: string;
  price_sgd: number;
  weight_g: number;
  rule_suggestions: RuleSuggestion[];
}

// Separate schema for text-only correction flags — includes rule_suggestions
const TEXT_ESTIMATION_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    ...NUTRITION_SCHEMA.properties,
    rule_suggestions: {
      type: SchemaType.ARRAY,
      description: "Suggested changes to customisation group rules based on user's description. Empty array if nothing needs changing.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          group_name:      { type: SchemaType.STRING,  description: "Name of the customisation group to change" },
          field:           { type: SchemaType.STRING,  description: "Which field: min_selections or max_selections" },
          current_value:   { type: SchemaType.INTEGER, description: "Current value (-1 if currently null/unlimited)" },
          suggested_value: { type: SchemaType.INTEGER, description: "Suggested new value (-1 to suggest unlimited)" },
          reason:          { type: SchemaType.STRING,  description: "Why this change is implied by the user's text" },
        },
        required: ["group_name", "field", "current_value", "suggested_value", "reason"],
      },
    },
  },
  required: [...(NUTRITION_SCHEMA.required ?? []), "rule_suggestions"],
};

export interface GroupContext {
  name: string;
  ui_hint: string;
  min_selections: number;
  max_selections: number | null;
}

export async function estimateNutritionFromText(
  flagDescription: string,
  groups?: GroupContext[]
): Promise<NutritionEstimate> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json", responseSchema: TEXT_ESTIMATION_SCHEMA },
  });

  const groupContext = groups && groups.length > 0
    ? `\n\nCurrent customisation rules for this item:\n${groups
        .map((g) => `- "${g.name}": min ${g.min_selections}, max ${g.max_selections ?? "unlimited"} (${g.ui_hint})`)
        .join("\n")}\n\nIf the user's text implies any rule is wrong (e.g. they picked more items than the max allows, or a required group turned out to be optional), add an entry to rule_suggestions.`
    : "\n\nNo customisation group context available — leave rule_suggestions empty.";

  const result = await model.generateContent([
    {
      text: `You are a nutrition estimation assistant for Singapore restaurant dishes.

A user has flagged a potential issue with verified nutrition data. Based solely on their text description, estimate what the correct nutrition values should be.

Rules for nutrition:
- If they mention specific numbers, use those directly
- If they describe the dish qualitatively, estimate accordingly
- Set confidence between 0.2 and 0.5 — this is text-only, no photo
- In notes, explain which parts of their text you relied on
${groupContext}

User flag: ${flagDescription}`,
    },
  ]);
  return JSON.parse(result.response.text()) as NutritionEstimate;
}

export interface ImageInput {
  base64: string;
  mimeType: string;
}

export async function estimateNutrition(
  images: ImageInput[],
  orderDescription: string
): Promise<NutritionEstimate> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json", responseSchema: NUTRITION_SCHEMA },
  });
  const result = await model.generateContent([
    ...images.map((img) => ({ inlineData: { data: img.base64, mimeType: img.mimeType } })),
    { text: `${NUTRITION_PROMPT}\n\nOrder description: ${orderDescription}` },
  ]);
  return JSON.parse(result.response.text()) as NutritionEstimate;
}

// ─── Menu reading ─────────────────────────────────────────────────────────────

const MENU_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    restaurant_name: {
      type: SchemaType.STRING,
      description: "Restaurant name if visible on the menu, otherwise empty string",
    },
    menu_type: {
      type: SchemaType.STRING,
      description: "fixed = individual dishes each with their own price. build_your_own = customer picks components from groups (base/protein/sides/sauce) at one set price. mixed = has both.",
    },
    meal_structure: {
      type: SchemaType.STRING,
      description: "For build_your_own: the selection formula shown on the menu, e.g. '1 protein + 3 sides + garnish + sauce'. Empty string for fixed menus.",
    },
    base_price_sgd: {
      type: SchemaType.NUMBER,
      description: "For build_your_own: the base meal price. 0 if not visible.",
    },
    dishes: {
      type: SchemaType.ARRAY,
      description: "For fixed/mixed menus: individual orderable dishes with their own price. For pure build_your_own, include only standalone add-ons or combo meals that have a distinct price.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name:      { type: SchemaType.STRING, description: "Dish name" },
          category:  { type: SchemaType.STRING, description: "Menu section/category, empty string if not visible" },
          price_sgd: { type: SchemaType.NUMBER, description: "Price in SGD, 0 if not shown" },
        },
        required: ["name", "category", "price_sgd"],
      },
    },
    customisation_groups: {
      type: SchemaType.ARRAY,
      description: "For build_your_own/mixed menus: each component category becomes a group. Empty array for fixed menus.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: {
            type: SchemaType.STRING,
            description: "Group name as shown on menu, e.g. Base Style, Proteins, Sides",
          },
          ui_hint: {
            type: SchemaType.STRING,
            description: "pick_one_required = must choose exactly 1 (e.g. base, protein). pick_many = can choose multiple (e.g. sides, garnish). pick_one = optional single choice (e.g. sauce if optional).",
          },
          max_selections: {
            type: SchemaType.INTEGER,
            description: "Maximum items allowed from this group. Use the meal structure to determine this: e.g. '3 sides' → 3. Use 0 for unlimited.",
          },
          options: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name:            { type: SchemaType.STRING, description: "Option name" },
                price_delta_sgd: { type: SchemaType.NUMBER, description: "Extra charge for this option, 0 if included in base price" },
              },
              required: ["name", "price_delta_sgd"],
            },
          },
        },
        required: ["name", "ui_hint", "max_selections", "options"],
      },
    },
    notes: {
      type: SchemaType.STRING,
      description: "Any relevant observations about the menu structure",
    },
  },
  required: ["restaurant_name", "menu_type", "meal_structure", "base_price_sgd", "dishes", "customisation_groups", "notes"],
};

const MENU_PROMPT = `You are extracting structured data from a restaurant menu image. If multiple images are provided, they show different parts of the same menu — read all of them together.

STEP 1 — Identify the menu type:
- FIXED: individual dishes each with a name and price. The most common format.
- BUILD YOUR OWN (BYO): customer assembles a meal by picking from ingredient categories (Base / Protein / Sides / Sauce etc.) at one set price. Signs: category columns, a single base price, or a formula like "1 protein + 3 sides".
- MIXED: has both fixed dishes and a BYO section.

STEP 2 — Extract accordingly:

For FIXED menus (most restaurants):
  - Set menu_type to "fixed", leave customisation_groups empty.
  - Fill "dishes" with EVERY item visible — name, menu category/section, and price.
  - Read carefully even if text is small. Extract every item you can identify.
  - Do not skip items because they are in a sub-section or written in a different style.

For BUILD YOUR OWN menus:
  - Set menu_type to "build_your_own".
  - Set meal_structure to the formula shown (e.g. "1 protein + 3 sides + sauce").
  - Set base_price_sgd to the stated base meal price.
  - Fill customisation_groups — one group per ingredient category.
  - Leave dishes empty unless there are standalone add-ons with their own distinct price.

For MIXED menus:
  - Fill both "dishes" (for fixed items) and "customisation_groups" (for the BYO section).

ui_hint rules for groups:
  pick_one_required = must choose exactly 1 (e.g. base style, wrap type, protein).
  pick_many = can choose multiple (e.g. sides, toppings, add-ons).
  pick_one = optional single choice (e.g. sauce if it appears optional).`;

export interface CustomisationGroupExtract {
  name: string;
  ui_hint: "pick_one_required" | "pick_one" | "pick_many";
  max_selections: number;
  options: { name: string; price_delta_sgd: number }[];
}

export interface MenuExtract {
  restaurant_name: string;
  menu_type: "fixed" | "build_your_own" | "mixed";
  meal_structure: string;
  base_price_sgd: number;
  dishes: { name: string; category: string; price_sgd: number }[];
  customisation_groups: CustomisationGroupExtract[];
  notes: string;
}

export async function readMenu(
  images: ImageInput[],
  submitterNotes?: string
): Promise<MenuExtract> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json", responseSchema: MENU_SCHEMA },
  });
  const contextNote = submitterNotes?.trim()
    ? `\n\nSubmitter's note: "${submitterNotes.trim()}"`
    : "";
  const result = await model.generateContent([
    ...images.map((img) => ({ inlineData: { data: img.base64, mimeType: img.mimeType } })),
    { text: MENU_PROMPT + contextNote },
  ]);
  return JSON.parse(result.response.text()) as MenuExtract;
}
