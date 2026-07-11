import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import type { MenuItem, Restaurant, GroupWithOptions } from "@/lib/types";
import { MealBuilderClient } from "@/components/meal-builder-client";

async function getBuilderData(
  slug: string,
  itemId: string
): Promise<{
  restaurant: Restaurant;
  item: MenuItem;
  groups: GroupWithOptions[];
} | null> {
  const restaurantRows = await sql`
    SELECT *
    FROM restaurants
    WHERE slug = ${slug}
    LIMIT 1
  `;

  const restaurant = restaurantRows[0] as Restaurant | undefined;

  if (!restaurant) return null;

  const itemRows = await sql`
    SELECT *
    FROM menu_items
    WHERE id = ${itemId}
      AND restaurant_id = ${restaurant.id}
    LIMIT 1
  `;

  const item = itemRows[0] as MenuItem | undefined;

  if (!item) return null;

  const groups = await sql`
    SELECT *
    FROM customisation_groups
    WHERE menu_item_id = ${itemId}
       OR (
         restaurant_id = ${restaurant.id}
         AND menu_item_id IS NULL
       )
    ORDER BY display_order ASC
  `;

  if (groups.length === 0) {
    return {
      restaurant,
      item,
      groups: [],
    };
  }

  const groupIds = groups.map((group) => group.id as string);

  const options = await sql`
    SELECT *
    FROM customisation_options
    WHERE group_id = ANY(${groupIds})
      AND is_available = true
    ORDER BY display_order ASC
  `;

  const groupsWithOptions = groups.map((group) => ({
    ...group,
    options: options.filter(
      (option) => option.group_id === group.id
    ),
  })) as GroupWithOptions[];

  return {
    restaurant,
    item,
    groups: groupsWithOptions,
  };
}

export default async function BuilderPage(
  props: {
  params: Promise<{
    slug: string;
    itemId: string;
  }>;
}
) {
  const { slug, itemId } = await props.params;
  const data = await getBuilderData(slug, itemId);

  if (!data) notFound();

  return (
    <MealBuilderClient
      restaurant={data.restaurant}
      item={data.item}
      groups={data.groups}
    />
  );
}
