"use client";

import { useState } from "react";
import Link from "next/link";
import { TierBadge } from "@/components/tier-badge";
import { NutritionSheet } from "@/components/nutrition-sheet";
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

function MenuItemRow({
  item,
  onClick,
}: {
  item: MenuItem;
  onClick: () => void;
}) {
  const hasData = item.base_calories !== null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors -mx-4 px-4 rounded-xl"
    >
      <div className="flex-1 min-w-0 pr-4">
        <p className="font-medium text-gray-900 truncate">{item.name}</p>
        {item.description && (
          <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">
            {item.description}
          </p>
        )}
        {item.has_customisation && (
          <p className="text-xs text-blue-500 mt-0.5">Customisable</p>
        )}
      </div>
      <div className="flex-shrink-0 text-right">
        {hasData ? (
          <div>
            <span className="font-semibold text-gray-900 tabular-nums">
              {item.base_calories}
            </span>
            <span className="text-xs text-gray-400 ml-0.5">kcal</span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">No data</span>
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
  const grouped = groupByCategory(menu);
  const categories = Object.keys(grouped);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-gray-900 truncate">
                  {restaurant.name}
                </h1>
                <TierBadge tier={restaurant.tier} />
              </div>
              {restaurant.location_tags.length > 0 && (
                <p className="text-xs text-gray-400 truncate">
                  {restaurant.location_tags.join(" · ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {menu.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">No menu items yet.</p>
            <p className="text-gray-300 text-xs mt-1">
              Be the first to submit nutrition data.
            </p>
          </div>
        ) : (
          categories.map((category) => (
            <section key={category}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {category}
              </h2>
              <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden px-4">
                {grouped[category].map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
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
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
      />
    </main>
  );
}
