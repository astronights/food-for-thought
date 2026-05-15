-- Phase 4 schema additions
-- Run this in the Supabase SQL Editor

-- Add per-ingredient delta column to crowdsource_submissions
-- Populated only for Build Your Own Bowl submissions
-- Structure: [{ group_name, option_name, calories_delta, protein_delta_g,
--               carbs_delta_g, fat_delta_g, fibre_delta_g, sugar_delta_g,
--               sat_fat_delta_g, sodium_delta_mg, confidence }]
alter table crowdsource_submissions
  add column if not exists ai_ingredient_deltas jsonb;
