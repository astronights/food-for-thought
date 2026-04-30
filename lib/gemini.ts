import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const NUTRITION_PROMPT = `You are a nutrition estimation assistant specialising in Singapore food.
Given a photo of a meal and a text description of what was ordered, estimate the nutritional content.

Return ONLY a valid JSON object with no extra text:
{
  "calories": <integer>,
  "protein_g": <number to 1 decimal>,
  "carbs_g": <number to 1 decimal>,
  "fat_g": <number to 1 decimal>,
  "fibre_g": <number to 1 decimal>,
  "sugar_g": <number to 1 decimal>,
  "sat_fat_g": <number to 1 decimal>,
  "sodium_mg": <integer>,
  "confidence": <number 0.0 to 1.0>,
  "notes": "<brief explanation of assumptions and portion size estimate>"
}

Base estimates on standard Singapore portion sizes. Lower confidence if the image is unclear.`;

const MENU_PROMPT = `You are reading a restaurant menu image.
Extract all visible dish names, categories, and prices.

Return ONLY a valid JSON object with no extra text:
{
  "restaurant_name": "<name if visible, else null>",
  "dishes": [
    { "name": "<dish name>", "category": "<category if visible, else null>", "price_sgd": <number or null> }
  ],
  "notes": "<any relevant observations>"
}`;

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

export interface MenuExtract {
  restaurant_name: string | null;
  dishes: { name: string; category: string | null; price_sgd: number | null }[];
  notes: string;
}

export async function estimateNutrition(
  base64Image: string,
  mimeType: string,
  orderDescription: string
): Promise<NutritionEstimate> {
  const result = await model.generateContent([
    { inlineData: { data: base64Image, mimeType } },
    { text: `${NUTRITION_PROMPT}\n\nOrder description: ${orderDescription}` },
  ]);
  const text = result.response.text().trim();
  const json = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(json) as NutritionEstimate;
}

export async function readMenu(
  base64Image: string,
  mimeType: string
): Promise<MenuExtract> {
  const result = await model.generateContent([
    { inlineData: { data: base64Image, mimeType } },
    { text: MENU_PROMPT },
  ]);
  const text = result.response.text().trim();
  const json = text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(json) as MenuExtract;
}
