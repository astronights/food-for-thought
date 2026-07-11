import type { MetadataRoute } from "next";
import { sql } from "@/lib/db";

const BASE_URL =
  "https://food-for-thought-kappa.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const restaurants = await sql`
    SELECT slug, created_at
    FROM restaurants
    ORDER BY created_at ASC
  `;

  const restaurantRoutes = restaurants.map((restaurant) => ({
    url: `${BASE_URL}/restaurants/${restaurant.slug}`,
    lastModified: new Date(
      restaurant.created_at as string
    ),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...restaurantRoutes,
  ];
}