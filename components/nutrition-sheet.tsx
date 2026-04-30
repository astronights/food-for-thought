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

function MacroBar({
  label,
  value,
  unit,
  color,
  percent,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  percent: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
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
    <div className="flex justify-between py-2 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium tabular-nums">
        {value}
        {unit}
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

  // Approximate % of daily reference values (2000 kcal day)
  const proteinPct = Math.round((protein / 50) * 100);
  const carbsPct = Math.round((carbs / 275) * 100);
  const fatPct = Math.round((fat / 78) * 100);

  const hasTier2Nutrients =
    item.base_fibre_g !== null ||
    item.base_sugar_g !== null ||
    item.base_sat_fat_g !== null ||
    item.base_sodium_mg !== null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl px-0 pb-10">
        <SheetHeader className="px-5 pb-2">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-left text-lg font-semibold leading-tight">
              {item.name}
            </SheetTitle>
            <TierBadge tier={restaurantTier} />
          </div>
          {item.description && (
            <p className="text-left text-sm text-gray-500 mt-1">{item.description}</p>
          )}
        </SheetHeader>

        <div className="px-5 mt-4 space-y-6">
          {/* Calories — hero number */}
          <div className="text-center py-4 bg-gray-50 rounded-xl">
            <div className="text-5xl font-bold tabular-nums tracking-tight">
              {cal}
            </div>
            <div className="text-sm text-gray-500 mt-1">kcal</div>
          </div>

          {/* Macro bars */}
          <div className="space-y-3">
            <MacroBar
              label="Protein"
              value={protein}
              unit="g"
              color="bg-blue-500"
              percent={proteinPct}
            />
            <MacroBar
              label="Carbohydrates"
              value={carbs}
              unit="g"
              color="bg-orange-400"
              percent={carbsPct}
            />
            <MacroBar
              label="Fat"
              value={fat}
              unit="g"
              color="bg-yellow-400"
              percent={fatPct}
            />
          </div>

          {/* Tier 2 nutrients — expandable */}
          {hasTier2Nutrients && (
            <>
              <Separator />
              <button
                className="flex w-full items-center justify-between text-sm font-medium text-gray-700"
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
                <div className="divide-y divide-gray-100">
                  <NutritionRow
                    label="Dietary Fibre"
                    value={item.base_fibre_g}
                    unit="g"
                  />
                  <NutritionRow
                    label="Sugar"
                    value={item.base_sugar_g}
                    unit="g"
                  />
                  <NutritionRow
                    label="Saturated Fat"
                    value={item.base_sat_fat_g}
                    unit="g"
                  />
                  <NutritionRow
                    label="Sodium"
                    value={item.base_sodium_mg}
                    unit="mg"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
