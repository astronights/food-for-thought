import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import type { MenuItem, Restaurant } from "@/lib/types";
import { RestaurantPageClient } from "@/components/restaurant-page-client";

async function getRestaurantAndMenu(slug: string): Promise<{
  restaurant: Restaurant;
  menu: MenuItem[];
} | null> {
  const { data: restaurant, error: rErr } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (rErr || !restaurant) return null;

  const { data: menu, error: mErr } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_available", true)
    .order("display_order", { ascending: true });

  if (mErr) {
    console.error("Failed to load menu:", mErr.message);
    return { restaurant, menu: [] };
  }

  return { restaurant, menu: menu ?? [] };
}

export async function generateMetadata(
  props: PageProps<"/restaurants/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, cuisine_tags")
    .eq("slug", slug)
    .single();

  if (!restaurant) return {};

  const title = `${restaurant.name} Nutrition Info`;
  const description = `Calorie and nutrition info for ${restaurant.name} Singapore. Browse the menu, build your meal and see live nutrition totals — no sign-up needed.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export async function generateStaticParams() {
  const { data } = await supabase.from("restaurants").select("slug");
  return (data ?? []).map((r) => ({ slug: r.slug }));
}

export const revalidate = 3600;

export default async function RestaurantPage(props: PageProps<"/restaurants/[slug]">) {
  const { slug } = await props.params;
  const result = await getRestaurantAndMenu(slug);

  if (!result) notFound();

  return <RestaurantPageClient restaurant={result.restaurant} menu={result.menu} />;
}
