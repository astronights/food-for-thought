"use client";

import { useState } from "react";
import Link from "next/link";
import { TierBadge } from "@/components/tier-badge";
import { NutritionSheet } from "@/components/nutrition-sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { NutrientSelector, type NutrientKey } from "@/components/nutrient-selector";
import { ContributeDishSheet } from "@/components/contribute-dish-sheet";
import { FlagCorrectionSheet } from "@/components/flag-correction-sheet";
import type { MenuItem, Restaurant } from "@/lib/types";
import { ArrowLeft, ChefHat, Camera, PlusCircle, X, Flag } from "lucide-react";

interface RestaurantPageClientProps {
  restaurant: Restaurant;
  menu: MenuItem[];
}

interface ContributeTarget {
  dishName: string;
  menuItemId: string | null;
  isNewDish: boolean;
  hasCustomisation: boolean;
  isVerified: boolean;
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

function BuildableItemCard({
  item, restaurantSlug, isContributing, onContribute, onFlag,
}: {
  item: MenuItem; restaurantSlug: string;
  isContributing: boolean; onContribute: () => void; onFlag: () => void;
}) {
  const isVerified = item.data_source === "verified";

  if (isContributing) {
    const action = isVerified ? onFlag : onContribute;
    const accent = isVerified
      ? "from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-100 dark:border-amber-900/40"
      : "from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-100 dark:border-amber-900/40";
    const iconColor = isVerified ? "text-amber-500" : "text-amber-600 dark:text-amber-400";
    const textColor = isVerified ? "text-amber-700 dark:text-amber-300" : "text-amber-800 dark:text-amber-300";
    const subtext = isVerified
      ? "Tap to flag a discrepancy with the verified data"
      : "Tap to contribute — pick your options + upload a photo";

    return (
      <button
        onClick={action}
        className={`w-full flex items-center gap-4 p-4 bg-gradient-to-r ${accent} rounded-xl border hover:shadow-sm transition-all active:scale-[0.99] text-left`}
      >
        <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
          {isVerified
            ? <Flag className={`h-5 w-5 ${iconColor}`} />
            : <Camera className={`h-5 w-5 ${iconColor}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold truncate ${textColor}`}>{item.name}</p>
          <p className="text-xs text-amber-600/70 dark:text-amber-500 mt-0.5">{subtext}</p>
        </div>
      </button>
    );
  }

  return (
    <Link href={`/restaurants/${restaurantSlug}/build/${item.id}`}>
      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/40 hover:shadow-sm transition-all active:scale-[0.99]">
        <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
          <ChefHat className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-emerald-800 dark:text-emerald-300 truncate">{item.name}</p>
          {item.description && (
            <p className="text-xs text-emerald-600/70 dark:text-emerald-500 mt-0.5 line-clamp-1">{item.description}</p>
          )}
        </div>
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 rounded-full flex-shrink-0">
          Build →
        </span>
      </div>
    </Link>
  );
}

function MenuItemRow({
  item, nutrient, isContributing, onClick, onContribute, onFlag,
}: {
  item: MenuItem; nutrient: NutrientKey; isContributing: boolean;
  onClick: () => void; onContribute: () => void; onFlag: () => void;
}) {
  const { value, unit } = getNutrientValue(item, nutrient);
  const isVerified = item.data_source === "verified";

  return (
    <button
      onClick={isContributing ? (isVerified ? onFlag : onContribute) : onClick}
      className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition-colors -mx-4 pl-4 pr-2"
    >
      <div className="flex-1 min-w-0 pr-2">
        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
        {item.description && (
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        {isContributing ? (
          isVerified
            ? <Flag className="h-4 w-4 text-amber-400" />
            : <Camera className="h-4 w-4 text-emerald-500" />
        ) : value !== null ? (
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

export function RestaurantPageClient({ restaurant, menu }: RestaurantPageClientProps) {
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [nutrient, setNutrient] = useState<NutrientKey>("calories");
  const [isContributing, setIsContributing] = useState(false);
  const [contributeTarget, setContributeTarget] = useState<ContributeTarget | null>(null);
  const [flagTarget, setFlagTarget] = useState<{ dishName: string; menuItemId: string | null } | null>(null);

  const canContribute = true;
  const buildableItems = menu.filter((i) => i.has_customisation);
  const regularItems = menu.filter((i) => !i.has_customisation);
  const grouped = groupByCategory(regularItems);
  const categories = Object.keys(grouped);

  function openContribute(target: ContributeTarget) {
    setContributeTarget(target);
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className={`sticky top-0 z-10 ${isContributing ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-emerald-600 to-teal-500"}`}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          {isContributing ? (
            <>
              <span className="text-white font-semibold flex-1 truncate text-sm">Contributing to {restaurant.name}</span>
              <button
                onClick={() => setIsContributing(false)}
                className="flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-medium"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {menu.length === 0 && !isContributing ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No menu items yet.</p>
            {canContribute && (
              <button
                onClick={() => openContribute({ dishName: "", menuItemId: null, isNewDish: true, hasCustomisation: false, isVerified: false })}
                className="mt-3 text-sm text-emerald-600 font-medium"
              >
                Be the first to add a dish →
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Buildable items */}
            {buildableItems.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">Build Your Meal</h2>
                <div className="space-y-3">
                  {buildableItems.map((item) => (
                    <BuildableItemCard
                      key={item.id}
                      item={item}
                      restaurantSlug={restaurant.slug}
                      isContributing={isContributing}
                      onContribute={() => openContribute({ dishName: item.name, menuItemId: item.id, isNewDish: false, hasCustomisation: true, isVerified: item.data_source === "verified" })}
                      onFlag={() => setFlagTarget({ dishName: item.name, menuItemId: item.id })}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Regular menu items */}
            {categories.map((category) => (
              <section key={category}>
                <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">{category}</h2>
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden px-4">
                  {grouped[category].map((item) => (
                    <MenuItemRow
                      key={item.id}
                      item={item}
                      nutrient={nutrient}
                      isContributing={isContributing}
                      onClick={() => setSelectedItem(item)}
                      onContribute={() => openContribute({ dishName: item.name, menuItemId: item.id, isNewDish: false, hasCustomisation: false, isVerified: item.data_source === "verified" })}
                      onFlag={() => setFlagTarget({ dishName: item.name, menuItemId: item.id })}
                    />
                  ))}
                  {/* New dish row in contribute mode */}
                  {isContributing && (
                    <button
                      onClick={() => openContribute({ dishName: "", menuItemId: null, isNewDish: true, hasCustomisation: false, isVerified: false })}
                      className="w-full flex items-center gap-2 py-3.5 -mx-4 pl-4 pr-2 text-emerald-600 dark:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Add a new dish</span>
                    </button>
                  )}
                </div>
              </section>
            ))}

            {/* New dish button when no categories yet */}
            {isContributing && categories.length === 0 && (
              <button
                onClick={() => openContribute({ dishName: "", menuItemId: null, isNewDish: true, hasCustomisation: false, isVerified: false })}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400"
              >
                <PlusCircle className="h-5 w-5" />
                <span className="text-sm font-medium">Add the first dish</span>
              </button>
            )}
          </>
        )}

        {/* Contribute button — Tier 2/3 only, at the bottom */}
        {canContribute && !isContributing && menu.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setIsContributing(true)}
              className="w-full py-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center justify-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
            >
              <Camera className="h-4 w-4" />
              Contribute nutrition data
            </button>
          </div>
        )}
      </div>

      <NutritionSheet
        item={selectedItem}
        restaurantTier={restaurant.tier}
        selectedNutrient={nutrient}
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
      />

      <ContributeDishSheet
        open={contributeTarget !== null && !contributeTarget?.isVerified}
        onClose={() => setContributeTarget(null)}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        dishName={contributeTarget?.dishName ?? ""}
        menuItemId={contributeTarget?.menuItemId ?? null}
        isNewDish={contributeTarget?.isNewDish ?? true}
        hasCustomisation={contributeTarget?.hasCustomisation ?? false}
      />

      <FlagCorrectionSheet
        open={flagTarget !== null}
        onClose={() => setFlagTarget(null)}
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        dishName={flagTarget?.dishName ?? ""}
        menuItemId={flagTarget?.menuItemId ?? null}
      />
    </main>
  );
}
