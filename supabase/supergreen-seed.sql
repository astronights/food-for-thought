-- ─────────────────────────────────────────────────────────────────────────────
-- Supergreen Seed Data
-- Source: Official Supergreen Nutritional & Allergen Information (Jan 2026)
-- Run AFTER schema.sql and phase3-schema.sql
--
-- Notes:
--   - Signature bowl nutrition = full complete bowl (all components included)
--   - BYO component nutrition = individual component only (per PDF note)
--   - Fibre, sugar, sat fat, sodium not published — stored as NULL
--   - BYO rule: 1–2 bases, up to 4 toppings (hot+cold combined), 1 protein, 1 dressing
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Restaurant ───────────────────────────────────────────────────────────────
insert into restaurants (id, name, slug, cuisine_tags, location_tags, website_url, is_chain, tier)
values (
  '55555555-0000-0000-0000-000000000001',
  'Supergreen',
  'supergreen',
  array['bowls','healthy','salads','build-your-own'],
  array['CBD','Raffles Place','Island-wide'],
  'https://www.supergreen.sg',
  true,
  1
) on conflict (id) do nothing;

-- ─── Signature Bowls (premade, full nutrition) ────────────────────────────────
insert into menu_items (
  id, restaurant_id, name, category,
  base_calories, base_protein_g, base_carbs_g, base_fat_g,
  base_weight_g,
  has_customisation, is_available, data_source, display_order
) values
  ('66666666-0000-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000001',
   'Grilled Salmon Bowl', 'Signature Bowls',
   487, 38.0, 18.0, 28.0, 400,
   false, true, 'verified', 0),

  ('66666666-0000-0000-0000-000000000002',
   '55555555-0000-0000-0000-000000000001',
   'Yakiniku Beef Bowl', 'Signature Bowls',
   599, 49.0, 25.0, 33.0, 385,
   false, true, 'verified', 1),

  ('66666666-0000-0000-0000-000000000003',
   '55555555-0000-0000-0000-000000000001',
   'Teriyaki Chicken Bowl', 'Signature Bowls',
   381, 30.0, 29.0, 16.0, 455,
   false, true, 'verified', 2),

  ('66666666-0000-0000-0000-000000000004',
   '55555555-0000-0000-0000-000000000001',
   'Lean Chicken Bowl', 'Signature Bowls',
   389, 46.0, 13.0, 17.0, 420,
   false, true, 'verified', 3),

  ('66666666-0000-0000-0000-000000000005',
   '55555555-0000-0000-0000-000000000001',
   'Mala Prawn Bowl', 'Signature Bowls',
   322, 24.0, 36.0, 9.0, 340,
   false, true, 'verified', 4),

  ('66666666-0000-0000-0000-000000000006',
   '55555555-0000-0000-0000-000000000001',
   'Smoked Duck Bowl', 'Signature Bowls',
   404, 30.0, 17.0, 24.0, 395,
   false, true, 'verified', 5),

  ('66666666-0000-0000-0000-000000000007',
   '55555555-0000-0000-0000-000000000001',
   'Vegan Power Bowl', 'Signature Bowls',
   354, 15.0, 53.0, 9.0, 370,
   false, true, 'verified', 6)
on conflict (id) do nothing;

-- ─── Build Your Own Bowl (starts at 0 — accumulates from selections) ──────────
insert into menu_items (
  id, restaurant_id, name, description, category,
  base_calories, base_protein_g, base_carbs_g, base_fat_g,
  has_customisation, is_available, data_source, display_order
) values (
  '66666666-0000-0000-0000-000000000010',
  '55555555-0000-0000-0000-000000000001',
  'Build Your Own Bowl',
  'Pick 1–2 bases, 1 protein, up to 4 toppings (hot or cold), and 1 dressing. Nutrition updates as you build.',
  'Customise',
  0, 0.0, 0.0, 0.0,
  true, true, 'verified', 0
) on conflict (id) do nothing;

-- ─── Customisation Groups ─────────────────────────────────────────────────────
insert into customisation_groups (id, menu_item_id, restaurant_id, name, ui_hint, min_selections, max_selections, display_order)
values
  -- Base: 1–2 required
  ('77777777-0000-0000-0000-000000000001',
   '66666666-0000-0000-0000-000000000010',
   '55555555-0000-0000-0000-000000000001',
   'Choose your base', 'pick_many', 1, 2, 0),

  -- Protein: exactly 1 required
  ('77777777-0000-0000-0000-000000000002',
   '66666666-0000-0000-0000-000000000010',
   '55555555-0000-0000-0000-000000000001',
   'Choose your protein', 'pick_one_required', 1, 1, 1),

  -- Toppings: up to 4 combined from hot and cold
  -- Shown as one group with hot items prefixed so user can distinguish
  ('77777777-0000-0000-0000-000000000003',
   '66666666-0000-0000-0000-000000000010',
   '55555555-0000-0000-0000-000000000001',
   'Toppings — hot or cold (up to 4)', 'pick_many', 0, 4, 2),

  -- Dressing: exactly 1 required
  ('77777777-0000-0000-0000-000000000004',
   '66666666-0000-0000-0000-000000000010',
   '55555555-0000-0000-0000-000000000001',
   'Choose your dressing', 'pick_one_required', 1, 1, 3)
on conflict (id) do nothing;

-- ─── Customisation Options — Bases ───────────────────────────────────────────
insert into customisation_options (id, group_id, name, calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g, display_order)
values
  ('88888888-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', 'Romaine Lettuce',  8,   1.0,  1.0, 0.0, 0),
  ('88888888-0000-0000-0000-000000000002', '77777777-0000-0000-0000-000000000001', 'Brown Rice',       250, 5.0, 53.0, 2.0, 1),
  ('88888888-0000-0000-0000-000000000003', '77777777-0000-0000-0000-000000000001', 'Fusilli Pasta',    179, 6.0, 37.0, 1.0, 2),
  ('88888888-0000-0000-0000-000000000004', '77777777-0000-0000-0000-000000000001', 'Soba Noodle',      117, 5.0, 23.0, 1.0, 3)
on conflict (id) do nothing;

-- ─── Customisation Options — Proteins ────────────────────────────────────────
insert into customisation_options (id, group_id, name, calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g, display_order)
values
  ('88888888-0000-0000-0000-000000000010', '77777777-0000-0000-0000-000000000002', 'Sichuan Mala Prawn',        111, 19.0, 2.0,  3.0,  0),
  ('88888888-0000-0000-0000-000000000011', '77777777-0000-0000-0000-000000000002', 'Teriyaki Chicken',          111, 18.0, 5.0,  2.0,  1),
  ('88888888-0000-0000-0000-000000000012', '77777777-0000-0000-0000-000000000002', 'Smoked Duck',               158, 15.0, 2.0, 10.0,  2),
  ('88888888-0000-0000-0000-000000000013', '77777777-0000-0000-0000-000000000002', 'Rosemary Sous-Vide Chicken',106, 22.0, 3.0,  1.0,  3),
  ('88888888-0000-0000-0000-000000000014', '77777777-0000-0000-0000-000000000002', 'Yakiniku Beef',             178, 22.0, 0.0, 10.0,  4),
  ('88888888-0000-0000-0000-000000000015', '77777777-0000-0000-0000-000000000002', 'Oven-Baked Salmon',         210, 23.0, 0.0, 13.0,  5),
  ('88888888-0000-0000-0000-000000000016', '77777777-0000-0000-0000-000000000002', 'Black Pepper Chicken',      282, 26.0,12.0, 15.0,  6)
on conflict (id) do nothing;

-- ─── Customisation Options — Toppings (hot then cold) ────────────────────────
insert into customisation_options (id, group_id, name, calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g, display_order)
values
  -- Hot toppings
  ('88888888-0000-0000-0000-000000000020', '77777777-0000-0000-0000-000000000003', 'Roasted Baby Corn (hot)',    30,  0.0,  3.0, 2.0,  0),
  ('88888888-0000-0000-0000-000000000021', '77777777-0000-0000-0000-000000000003', 'Roasted Sweet Potato (hot)', 95,  0.0, 17.0, 3.0,  1),
  ('88888888-0000-0000-0000-000000000022', '77777777-0000-0000-0000-000000000003', 'Chickpea Relish (hot)',      54,  8.0,  2.0, 3.0,  2),
  ('88888888-0000-0000-0000-000000000023', '77777777-0000-0000-0000-000000000003', 'Oven-Baked Broccoli (hot)',  64,  3.0,  3.0, 5.0,  3),
  ('88888888-0000-0000-0000-000000000024', '77777777-0000-0000-0000-000000000003', 'Sesame Tofu (hot)',         177, 12.0,  7.0,11.0,  4),
  ('88888888-0000-0000-0000-000000000025', '77777777-0000-0000-0000-000000000003', 'Roasted Pumpkin (hot)',      63,  1.0,  6.0, 4.0,  5),
  -- Cold toppings
  ('88888888-0000-0000-0000-000000000026', '77777777-0000-0000-0000-000000000003', 'Achar',              85,  2.0, 13.0, 4.0,  6),
  ('88888888-0000-0000-0000-000000000027', '77777777-0000-0000-0000-000000000003', 'Jalapeños',          12,  0.0,  3.0, 0.0,  7),
  ('88888888-0000-0000-0000-000000000028', '77777777-0000-0000-0000-000000000003', 'Japanese Cucumber',  10,  1.0,  2.0, 0.0,  8),
  ('88888888-0000-0000-0000-000000000029', '77777777-0000-0000-0000-000000000003', 'Sweet Corn',         33,  1.0,  6.0, 1.0,  9),
  ('88888888-0000-0000-0000-000000000030', '77777777-0000-0000-0000-000000000003', 'Edamame',            58,  5.0,  4.0, 2.0, 10),
  ('88888888-0000-0000-0000-000000000031', '77777777-0000-0000-0000-000000000003', 'Kimchi',             13,  1.0,  2.0, 0.0, 11),
  ('88888888-0000-0000-0000-000000000032', '77777777-0000-0000-0000-000000000003', 'Japanese Seaweed',   32,  0.0,  4.0, 1.0, 12),
  ('88888888-0000-0000-0000-000000000033', '77777777-0000-0000-0000-000000000003', 'Cherry Tomato',      17,  1.0,  3.0, 0.0, 13),
  ('88888888-0000-0000-0000-000000000034', '77777777-0000-0000-0000-000000000003', 'Raisin',             87,  1.0, 21.0, 0.0, 14),
  ('88888888-0000-0000-0000-000000000035', '77777777-0000-0000-0000-000000000003', 'Purple Cabbage',     11,  0.0,  2.0, 0.0, 15),
  ('88888888-0000-0000-0000-000000000036', '77777777-0000-0000-0000-000000000003', 'Hard Boiled Egg',    85,  7.0,  0.0, 6.0, 16),
  ('88888888-0000-0000-0000-000000000037', '77777777-0000-0000-0000-000000000003', 'Sous Vide Egg',      85,  7.0,  0.0, 6.0, 17)
on conflict (id) do nothing;

-- ─── Customisation Options — Dressings ───────────────────────────────────────
insert into customisation_options (id, group_id, name, calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g, display_order)
values
  ('88888888-0000-0000-0000-000000000040', '77777777-0000-0000-0000-000000000004', 'Mint Jalapeño',             132, 0.0,  2.0, 14.0, 0),
  ('88888888-0000-0000-0000-000000000041', '77777777-0000-0000-0000-000000000004', 'Japanese Roasted Sesame',   136, 0.0,  2.0, 14.0, 1),
  ('88888888-0000-0000-0000-000000000042', '77777777-0000-0000-0000-000000000004', 'Honey Mustard',             100, 1.0, 10.0,  7.0, 2),
  ('88888888-0000-0000-0000-000000000043', '77777777-0000-0000-0000-000000000004', 'Ginger Soy',                135, 0.0,  6.0, 12.0, 3),
  ('88888888-0000-0000-0000-000000000044', '77777777-0000-0000-0000-000000000004', 'Honey Lime',                171, 0.0, 11.0, 14.0, 4),
  ('88888888-0000-0000-0000-000000000045', '77777777-0000-0000-0000-000000000004', 'Spicy Mayo',                197, 0.0,  6.0, 19.0, 5),
  ('88888888-0000-0000-0000-000000000046', '77777777-0000-0000-0000-000000000004', 'Balsamic Vinaigrette',      204, 0.0,  6.0, 20.0, 6),
  ('88888888-0000-0000-0000-000000000047', '77777777-0000-0000-0000-000000000004', 'Extra Virgin Olive Oil',    360, 0.0,  0.0, 40.0, 7)
on conflict (id) do nothing;
