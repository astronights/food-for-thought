export type RestaurantTier = 1 | 2 | 3;

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  cuisine_tags: string[];
  location_tags: string[];
  logo_url: string | null;
  website_url: string | null;
  is_chain: boolean;
  tier: RestaurantTier;
  created_at: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  category: string;
  base_calories: number | null;
  base_protein_g: number | null;
  base_carbs_g: number | null;
  base_fat_g: number | null;
  base_fibre_g: number | null;
  base_sugar_g: number | null;
  base_sat_fat_g: number | null;
  base_sodium_mg: number | null;
  has_customisation: boolean;
  is_available: boolean;
  data_source: 'verified' | 'ai_estimate' | 'crowdsourced';
  display_order: number;
  created_at: string;
}

export interface CustomisationGroup {
  id: string;
  menu_item_id: string | null;
  restaurant_id: string;
  name: string;
  ui_hint: 'pick_one' | 'pick_many' | 'pick_one_required';
  min_selections: number;
  max_selections: number | null;
  display_order: number;
}

export interface CustomisationOption {
  id: string;
  group_id: string;
  name: string;
  calories_delta: number;
  protein_delta_g: number;
  carbs_delta_g: number;
  fat_delta_g: number;
  fibre_delta_g: number;
  sugar_delta_g: number;
  sat_fat_delta_g: number;
  sodium_delta_mg: number;
  price_delta_sgd: number | null;
  is_available: boolean;
  display_order: number;
}

export interface NutritionTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number | null;
  sugar_g: number | null;
  sat_fat_g: number | null;
  sodium_mg: number | null;
}
