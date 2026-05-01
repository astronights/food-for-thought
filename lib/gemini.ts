// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const MODEL = "gemini-2.5-flash-lite";

// ─── Nutrition estimation ─────────────────────────────────────────────────────

const NUTRITION_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    calories:    { type: SchemaType.INTEGER,  description: "Total calories in kcal" },
    protein_g:   { type: SchemaType.NUMBER,   description: "Protein in grams (1 decimal)" },
    carbs_g:     { type: SchemaType.NUMBER,   description: "Total carbohydrates in grams" },
    fat_g:       { type: SchemaType.NUMBER,   description: "Total fat in grams" },
    fibre_g:     { type: SchemaType.NUMBER,   description: "Dietary fibre in grams" },
    sugar_g:     { type: SchemaType.NUMBER,   description: "Sugar in grams" },
    sat_fat_g:   { type: SchemaType.NUMBER,   description: "Saturated fat in grams" },
    sodium_mg:   { type: SchemaType.INTEGER,  description: "Sodium in milligrams" },
    confidence:  { type: SchemaType.NUMBER,   description: "Confidence score 0.0 to 1.0" },
    notes:       { type: SchemaType.STRING,   description: "Brief explanation of assumptions and portion estimate" },
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
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: NUTRITION_SCHEMA,
    },
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
    restaurant_name: { type: SchemaType.STRING, description: "Restaurant name if visible on the menu, otherwise empty string" },
    dishes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name:      { type: SchemaType.STRING, description: "Dish name" },
          category:  { type: SchemaType.STRING, description: "Menu category if visible, otherwise empty string" },
          price_sgd: { type: SchemaType.NUMBER, description: "Price in SGD if visible, otherwise 0" },
        },
        required: ["name", "category", "price_sgd"],
      },
    },
    notes: { type: SchemaType.STRING, description: "Any relevant observations about the menu" },
  },
  required: ["restaurant_name", "dishes", "notes"],
};

const MENU_PROMPT = `You are reading a restaurant menu image. Extract all visible dish names, their categories, and prices.`;

export interface MenuExtract {
  restaurant_name: string;
  dishes: { name: string; category: string; price_sgd: number }[];
  notes: string;
}

export async function readMenu(
  base64Image: string,
  mimeType: string
): Promise<MenuExtract> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: MENU_SCHEMA,
    },
  });

  const result = await model.generateContent([
    { inlineData: { data: base64Image, mimeType } },
    { text: MENU_PROMPT },
  ]);

  return JSON.parse(result.response.text()) as MenuExtract;
}
