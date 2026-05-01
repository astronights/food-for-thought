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
  },
  required: ["calories", "protein_g", "carbs_g", "fat_g", "fibre_g", "sugar_g", "sat_fat_g", "sodium_mg", "confidence", "notes"],
};

const NUTRITION_PROMPT = `You are a nutrition estimation assistant specialising in Singapore food.
Given a photo of a meal and a text description of what was ordered, estimate the nutritional content.
Base estimates on standard Singapore portion sizes. Lower confidence if the image is unclear.`;

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
}

export async function estimateNutrition(
  base64Image: string,
  mimeType: string,
  orderDescription: string
): Promise<NutritionEstimate> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json", responseSchema: NUTRITION_SCHEMA },
  });
  const result = await model.generateContent([
    { inlineData: { data: base64Image, mimeType } },
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

const MENU_PROMPT = `You are reading a restaurant menu image. Analyse the menu structure carefully before extracting data.

CRITICAL: Many Singapore restaurants — especially salad, bowl, and healthy food places — use a BUILD YOUR OWN format:
the customer picks components from several categories (e.g. base, protein, sides, garnish, sauce) at a single set price.
This is NOT a list of individual dishes. Detect this pattern by looking for:
- Component categories listed as columns or sections (Base / Protein / Sides / Sauce etc.)
- A single price shown for the whole meal
- A selection formula like "1 protein + 3 sides" shown at the top

For BUILD YOUR OWN menus:
- Set menu_type to "build_your_own"
- Set meal_structure to the formula shown (e.g. "1 protein + 3 sides + garnish + sauce")
- Set base_price_sgd to the base meal price
- Fill customisation_groups — one group per category, with the correct ui_hint and max_selections derived from the meal formula
- Leave dishes empty unless there are standalone add-ons with their own distinct price

For REGULAR menus with individual dishes:
- Set menu_type to "fixed"
- Fill dishes with each orderable item and its price
- Leave customisation_groups empty`;

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
  base64Image: string,
  mimeType: string
): Promise<MenuExtract> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { responseMimeType: "application/json", responseSchema: MENU_SCHEMA },
  });
  const result = await model.generateContent([
    { inlineData: { data: base64Image, mimeType } },
    { text: MENU_PROMPT },
  ]);
  return JSON.parse(result.response.text()) as MenuExtract;
}
