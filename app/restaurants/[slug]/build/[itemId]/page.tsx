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

  // Two explicit queries — avoids PostgREST .or() + IS NULL unreliability
  const [{ data: itemGroups }, { data: restaurantGroups }] = await Promise.all([
    supabase.from("customisation_groups").select("*")
      .eq("menu_item_id", itemId)
      .order("display_order", { ascending: true }),
    supabase.from("customisation_groups").select("*")
      .eq("restaurant_id", restaurant.id)
      .is("menu_item_id", null)
      .order("display_order", { ascending: true }),
  ]);

  const groups = [
    ...(itemGroups ?? []),
    ...(restaurantGroups ?? []),
  ].sort((a, b) => a.display_order - b.display_order);

  if (groups.length === 0) return { restaurant, item, groups: [] };

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
