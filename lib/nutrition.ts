import type { MenuItem, CustomisationOption, NutritionTotals } from "@/lib/types";

export function calculateNutrition(
  item: MenuItem,
  selectedOptions: CustomisationOption[]
): NutritionTotals {
  const base: NutritionTotals = {
    calories: item.base_calories ?? 0,
    protein_g: Number(item.base_protein_g ?? 0),
    carbs_g: Number(item.base_carbs_g ?? 0),
    fat_g: Number(item.base_fat_g ?? 0),
    fibre_g: item.base_fibre_g !== null ? Number(item.base_fibre_g) : null,
    sugar_g: item.base_sugar_g !== null ? Number(item.base_sugar_g) : null,
    sat_fat_g: item.base_sat_fat_g !== null ? Number(item.base_sat_fat_g) : null,
    sodium_mg: item.base_sodium_mg,
  };

  return selectedOptions.reduce<NutritionTotals>(
    (totals, opt) => ({
      calories: totals.calories + (opt.calories_delta ?? 0),
      protein_g: totals.protein_g + Number(opt.protein_delta_g ?? 0),
      carbs_g: totals.carbs_g + Number(opt.carbs_delta_g ?? 0),
      fat_g: totals.fat_g + Number(opt.fat_delta_g ?? 0),
      fibre_g: totals.fibre_g !== null ? totals.fibre_g + Number(opt.fibre_delta_g ?? 0) : null,
      sugar_g: totals.sugar_g !== null ? totals.sugar_g + Number(opt.sugar_delta_g ?? 0) : null,
      sat_fat_g: totals.sat_fat_g !== null ? totals.sat_fat_g + Number(opt.sat_fat_delta_g ?? 0) : null,
      sodium_mg: totals.sodium_mg !== null ? totals.sodium_mg + (opt.sodium_delta_mg ?? 0) : null,
    }),
    base
  );
}
