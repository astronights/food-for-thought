"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { TierBadge } from "@/components/tier-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { calculateNutrition } from "@/lib/nutrition";
import type { CustomisationOption, MenuItem, Restaurant } from "@/lib/types";
import type { GroupWithOptions } from "@/app/restaurants/[slug]/build/[itemId]/page";

interface MealBuilderClientProps {
  restaurant: Restaurant;
  item: MenuItem;
  groups: GroupWithOptions[];
}

// selections: groupId → optionId (pick_one*) or optionId[] (pick_many)
type Selections = Record<string, string | string[]>;

function getSelectedOptions(groups: GroupWithOptions[], selections: Selections): CustomisationOption[] {
  return groups.flatMap((group) => {
    const sel = selections[group.id];
    if (!sel) return [];
    if (Array.isArray(sel)) return group.options.filter((o) => sel.includes(o.id));
    return group.options.filter((o) => o.id === sel);
  });
}

function isGroupComplete(group: GroupWithOptions, selections: Selections): boolean {
  if (group.ui_hint !== "pick_one_required") return true;
  const sel = selections[group.id];
  return !!sel && sel !== "";
}

export function MealBuilderClient({ restaurant, item, groups }: MealBuilderClientProps) {
  const [selections, setSelections] = useState<Selections>({});
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const selectedOptions = useMemo(
    () => getSelectedOptions(groups, selections),
    [groups, selections]
  );

  const totals = useMemo(
    () => calculateNutrition(item, selectedOptions),
    [item, selectedOptions]
  );

  const incompleteGroups = groups.filter((g) => !isGroupComplete(g, selections));
  const isComplete = incompleteGroups.length === 0;

  function selectOne(groupId: string, optionId: string) {
    setSelections((prev) => ({ ...prev, [groupId]: optionId }));
  }

  function toggleMany(groupId: string, optionId: string, max: number | null) {
    setSelections((prev) => {
      const current = (prev[groupId] as string[] | undefined) ?? [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (max !== null && current.length >= max) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-36">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href={`/restaurants/${restaurant.slug}`}
            className="text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white truncate">{item.name}</span>
              <TierBadge tier={restaurant.tier} />
            </div>
            <p className="text-xs text-emerald-100 truncate">{restaurant.name}</p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Groups */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {groups.map((group) => {
          const isRequired = group.ui_hint === "pick_one_required";
          const isInvalid = attempted && isRequired && !isGroupComplete(group, selections);
          const isPickMany = group.ui_hint === "pick_many";
          const currentMany = (selections[group.id] as string[] | undefined) ?? [];

          return (
            <section key={group.id}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1">
                  {group.name}
                </h2>
                {isRequired && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isInvalid
                        ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                        : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                    }`}
                  >
                    Required
                  </span>
                )}
                {isPickMany && group.max_selections && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    up to {group.max_selections}
                  </span>
                )}
              </div>

              <div
                className={`bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-800 ${
                  isInvalid
                    ? "border-red-300 dark:border-red-700"
                    : "border-gray-100 dark:border-gray-800"
                }`}
              >
                {group.options.map((option) => {
                  const isSelected = isPickMany
                    ? currentMany.includes(option.id)
                    : selections[group.id] === option.id;
                  const isDisabled =
                    isPickMany &&
                    group.max_selections !== null &&
                    currentMany.length >= group.max_selections &&
                    !isSelected;

                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        if (isDisabled) return;
                        if (isPickMany) {
                          toggleMany(group.id, option.id, group.max_selections);
                        } else {
                          selectOne(group.id, option.id);
                        }
                      }}
                      disabled={isDisabled}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                        isSelected
                          ? "bg-emerald-50 dark:bg-emerald-950/30"
                          : isDisabled
                          ? "opacity-40"
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      {/* Radio / Checkbox indicator */}
                      <div
                        className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isPickMany ? "rounded-md" : "rounded-full"
                        } ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="h-3 w-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Option label */}
                      <span
                        className={`flex-1 text-sm font-medium ${
                          isSelected
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {option.name}
                      </span>

                      {/* Calorie delta */}
                      {option.calories_delta !== 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums flex-shrink-0">
                          {option.calories_delta > 0 ? "+" : ""}
                          {option.calories_delta} kcal
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Sticky footer — live totals */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="max-w-lg mx-auto">
          <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-lg">
            {/* Expandable full breakdown */}
            {showBreakdown && (
              <div className="px-5 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-x-6 gap-y-2">
                {totals.fibre_g !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Fibre</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">{totals.fibre_g.toFixed(1)} g</span>
                  </div>
                )}
                {totals.sugar_g !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Sugar</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">{totals.sugar_g.toFixed(1)} g</span>
                  </div>
                )}
                {totals.sat_fat_g !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Sat Fat</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">{totals.sat_fat_g.toFixed(1)} g</span>
                  </div>
                )}
                {totals.sodium_mg !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Sodium</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300 tabular-nums">{totals.sodium_mg} mg</span>
                  </div>
                )}
              </div>
            )}

            {/* Main totals row */}
            <div className="px-4 py-3 flex items-center gap-3">
              {/* Calories */}
              <div className="text-center flex-shrink-0">
                <div className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
                  {totals.calories}
                </div>
                <div className="text-xs text-gray-400">kcal</div>
              </div>

              <div className="w-px h-8 bg-gray-100 dark:bg-gray-800 flex-shrink-0" />

              {/* Macros */}
              <div className="flex flex-1 justify-around">
                <div className="text-center">
                  <div className="text-sm font-bold tabular-nums text-blue-500">{totals.protein_g.toFixed(1)}<span className="text-xs font-normal ml-0.5">g</span></div>
                  <div className="text-xs text-gray-400">Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold tabular-nums text-orange-500">{totals.carbs_g.toFixed(1)}<span className="text-xs font-normal ml-0.5">g</span></div>
                  <div className="text-xs text-gray-400">Carbs</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold tabular-nums text-amber-500">{totals.fat_g.toFixed(1)}<span className="text-xs font-normal ml-0.5">g</span></div>
                  <div className="text-xs text-gray-400">Fat</div>
                </div>
              </div>

              {/* Expand toggle */}
              <button
                onClick={() => setShowBreakdown((v) => !v)}
                className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {showBreakdown ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>

            {/* Done button */}
            <div className="px-4 pb-4">
              <button
                onClick={() => {
                  if (!isComplete) {
                    setAttempted(true);
                    const firstIncomplete = incompleteGroups[0];
                    document.getElementById(`group-${firstIncomplete.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                  isComplete
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {isComplete ? "✓ Meal built" : `Complete your selections`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
