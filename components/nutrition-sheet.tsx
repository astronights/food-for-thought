"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { TierBadge } from "@/components/tier-badge";
import type { MenuItem, RestaurantTier } from "@/lib/types";
import { ChevronDown, ChevronUp } from "lucide-react";

interface NutritionSheetProps {
  item: MenuItem | null;
  restaurantTier: RestaurantTier;
  open: boolean;
  onClose: () => void;
}

function MacroStat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="flex-1 text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>
        {value}
        <span className="text-base font-semibold ml-0.5">{unit}</span>
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function NutritionRow({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  if (value === null) return null;
  return (
    <div className="flex justify-between py-2.5 text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium tabular-nums text-gray-900 dark:text-gray-100">
        {value}{unit}
      </span>
    </div>
  );
}

export function NutritionSheet({
  item,
  restaurantTier,
  open,
  onClose,
}: NutritionSheetProps) {
  const [showMore, setShowMore] = useState(false);

  if (!item) return null;

  const cal = item.base_calories ?? 0;
  const protein = item.base_protein_g ?? 0;
  const carbs = item.base_carbs_g ?? 0;
  const fat = item.base_fat_g ?? 0;

  const hasTier2Nutrients =
    item.base_fibre_g !== null ||
    item.base_sugar_g !== null ||
    item.base_sat_fat_g !== null ||
    item.base_sodium_mg !== null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto rounded-t-2xl px-0 pb-10 bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
      >
        <SheetHeader className="px-5 pb-2 pr-12">
          <div className="flex items-center gap-2">
            <TierBadge tier={restaurantTier} />
            <SheetTitle className="text-left text-lg font-semibold leading-tight text-gray-900 dark:text-gray-100">
              {item.name}
            </SheetTitle>
          </div>
          {item.description && (
            <p className="text-left text-sm text-gray-400 dark:text-gray-500 mt-1">
              {item.description}
            </p>
          )}
        </SheetHeader>

        <div className="px-5 mt-4 space-y-5">
          {/* Calories — hero */}
          <div className="text-center py-5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 rounded-2xl">
            <div className="text-6xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-gray-100">
              {cal}
            </div>
            <div className="text-sm text-gray-400 dark:text-gray-500 mt-1 font-medium uppercase tracking-wide text-xs">
              calories
            </div>
          </div>

          {/* Macros — big numbers side by side */}
          <div className="flex gap-2 py-1">
            <MacroStat label="Protein" value={Number(protein)} unit="g" color="text-blue-500" />
            <div className="w-px bg-gray-100 dark:bg-gray-800" />
            <MacroStat label="Carbs" value={Number(carbs)} unit="g" color="text-orange-500" />
            <div className="w-px bg-gray-100 dark:bg-gray-800" />
            <MacroStat label="Fat" value={Number(fat)} unit="g" color="text-amber-500" />
          </div>

          {/* Tier 2 nutrients — expandable */}
          {hasTier2Nutrients && (
            <>
              <Separator className="dark:bg-gray-800" />
              <button
                className="flex w-full items-center justify-between text-sm font-medium text-gray-600 dark:text-gray-400"
                onClick={() => setShowMore((v) => !v)}
              >
                More nutrients
                {showMore ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {showMore && (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  <NutritionRow label="Dietary Fibre" value={item.base_fibre_g} unit="g" />
                  <NutritionRow label="Sugar" value={item.base_sugar_g} unit="g" />
                  <NutritionRow label="Saturated Fat" value={item.base_sat_fat_g} unit="g" />
                  <NutritionRow label="Sodium" value={item.base_sodium_mg} unit="mg" />
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
