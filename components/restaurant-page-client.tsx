"use client";

import { useState } from "react";
import Link from "next/link";
import { TierBadge } from "@/components/tier-badge";
import { NutritionSheet } from "@/components/nutrition-sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { NutrientSelector, type NutrientKey } from "@/components/nutrient-selector";
import type { MenuItem, Restaurant } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

interface RestaurantPageClientProps {
  restaurant: Restaurant;
  menu: MenuItem[];
}

function groupByCategory(items: MenuItem[]): Record<string, MenuItem[]> {
  return items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

function getNutrientValue(item: MenuItem, key: NutrientKey): { value: number | null; unit: string } {
  switch (key) {
    case "calories": return { value: item.base_calories, unit: "kcal" };
    case "protein":  return { value: item.base_protein_g !== null ? Number(item.base_protein_g) : null, unit: "g" };
    case "carbs":    return { value: item.base_carbs_g !== null ? Number(item.base_carbs_g) : null, unit: "g" };
    case "fat":      return { value: item.base_fat_g !== null ? Number(item.base_fat_g) : null, unit: "g" };
  }
}

function MenuItemRow({
  item,
  nutrient,
  onClick,
}: {
  item: MenuItem;
  nutrient: NutrientKey;
  onClick: () => void;
}) {
  const { value, unit } = getNutrientValue(item, nutrient);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition-colors -mx-4 pl-4 pr-2"
    >
      <div className="flex-1 min-w-0 pr-2">
        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
        {item.description && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
            {item.description}
          </p>
        )}
        {item.has_customisation && (
          <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-0.5 font-medium">
            Customisable
          </p>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        {value !== null ? (
          <div>
            <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</span>
            <span className="text-xs text-gray-400 ml-1">{unit}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
        )}
      </div>
    </button>
  );
}

export function RestaurantPageClient({
  restaurant,
  menu,
}: RestaurantPageClientProps) {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [nutrient, setNutrient] = useState<NutrientKey>("calories");
  const grouped = groupByCategory(menu);
  const categories = Object.keys(grouped);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-white truncate">{restaurant.name}</h1>
              <TierBadge tier={restaurant.tier} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NutrientSelector value={nutrient} onChange={setNutrient} />
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {menu.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">No menu items yet.</p>
          </div>
        ) : (
          categories.map((category) => (
            <section key={category}>
              <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                {category}
              </h2>
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden px-4">
                {grouped[category].map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    nutrient={nutrient}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <NutritionSheet
        item={selectedItem}
        restaurantTier={restaurant.tier}
        selectedNutrient={nutrient}
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
      />
    </main>
  );
}
