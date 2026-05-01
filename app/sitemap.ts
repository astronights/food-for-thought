import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const BASE_URL = "https://food-for-thought-kappa.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("slug, created_at")
    .order("created_at", { ascending: true });

  const restaurantRoutes = (restaurants ?? []).map((r) => ({
    url: `${BASE_URL}/restaurants/${r.slug}`,
    lastModified: new Date(r.created_at),
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
