import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { MenuItem, Restaurant, GroupWithOptions } from "@/lib/types";
import { MealBuilderClient } from "@/components/meal-builder-client";

async function getBuilderData(slug: string, itemId: string): Promise<{
  restaurant: Restaurant;
  item: MenuItem;
  groups: GroupWithOptions[];
} | null> {
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!restaurant) return null;

  const { data: item } = await supabase
    .from("menu_items")
    .select("*")
    .eq("id", itemId)
    .eq("restaurant_id", restaurant.id)
    .single();

  if (!item) return null;

  // Fetch item-specific groups AND restaurant-wide groups (menu_item_id = null)
  const { data: groups } = await supabase
    .from("customisation_groups")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .or(`menu_item_id.eq.${itemId},menu_item_id.is.null`)
    .order("display_order", { ascending: true });

  if (!groups || groups.length === 0) return { restaurant, item, groups: [] };

  const groupIds = groups.map((g) => g.id);
  const { data: options } = await supabase
    .from("customisation_options")
    .select("*")
    .in("group_id", groupIds)
    .eq("is_available", true)
    .order("display_order", { ascending: true });

  const groupsWithOptions: GroupWithOptions[] = groups.map((g) => ({
    ...g,
    options: (options ?? []).filter((o) => o.group_id === g.id),
  }));

  return { restaurant, item, groups: groupsWithOptions };
}

export default async function BuilderPage(
  props: PageProps<"/restaurants/[slug]/build/[itemId]">
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
