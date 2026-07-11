import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import type { MenuItem, Restaurant } from "@/lib/types";
import { RestaurantPageClient } from "@/components/restaurant-page-client";

async function getRestaurantAndMenu(
  slug: string
): Promise<{
  restaurant: Restaurant;
  menu: MenuItem[];
} | null> {
  const restaurantRows = await sql`
    SELECT *
    FROM restaurants
    WHERE slug = ${slug}
    LIMIT 1
  `;

  const restaurant =
    restaurantRows[0] as Restaurant | undefined;

  if (!restaurant) return null;

  const menuRows = await sql`
    SELECT *
    FROM menu_items
    WHERE restaurant_id = ${restaurant.id}
      AND is_available = true
    ORDER BY display_order ASC
  `;

  return {
    restaurant,
    menu: menuRows as MenuItem[],
  };
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const { slug } = await props.params;

  const rows = await sql`
    SELECT name, cuisine_tags
    FROM restaurants
    WHERE slug = ${slug}
    LIMIT 1
  `;

  const restaurant = rows[0] as
    | {
        name: string;
        cuisine_tags: string[] | null;
      }
    | undefined;

  if (!restaurant) return {};

  const title = `${restaurant.name} Nutrition Info`;

  const description =
    `Calorie and nutrition info for ${restaurant.name} Singapore. ` +
    `Browse the menu, build your meal and see live nutrition totals — no sign-up needed.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    twitter: {
      title,
      description,
    },
  };
}

export async function generateStaticParams() {
  const rows = await sql`
    SELECT slug
    FROM restaurants
  `;

  return rows.map((row) => ({
    slug: row.slug as string,
  }));
}

export const revalidate = 3600;

export default async function RestaurantPage(
  props: {
    params: Promise<{ slug: string }>;
  }
) {
  const { slug } = await props.params;
  const result = await getRestaurantAndMenu(slug);

  if (!result) notFound();

  return <RestaurantPageClient restaurant={result.restaurant} menu={result.menu} />;
}
