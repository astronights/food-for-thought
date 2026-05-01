-- ─────────────────────────────────────────────────────────────────────────────
-- Stuff'd Singapore Seed Data
-- Source: https://www.stuffd.com/sg/nutrition/ (extracted May 2026)
--
-- Structure:
--   4 customisable items: Kebab, Burrito, Quesadilla, Daily Bowl
--   Item-specific groups: wrap selection (Kebab/Burrito/Quesadilla only)
--   Restaurant-wide groups (menu_item_id = null): shared across all 4 items
--     — Main, Vegetables, Sauce, Add-ons, Toppings
--
-- This uses the restaurant-wide group feature (menu_item_id = null).
-- The builder fetches both item-specific AND restaurant-wide groups.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Restaurant ───────────────────────────────────────────────────────────────
insert into restaurants (id, name, slug, cuisine_tags, location_tags, website_url, is_chain, tier)
values (
  '99999999-0000-0000-0000-000000000001',
  'Stuff''d',
  'stuffd',
  array['wraps','bowls','kebab','burrito','healthy'],
  array['Island-wide','CBD','Orchard'],
  'https://www.stuffd.com/sg',
  true,
  1
) on conflict (id) do nothing;

-- ─── Menu Items (all customisable, start at 0) ───────────────────────────────
insert into menu_items (
  id, restaurant_id, name, description, category,
  base_calories, base_protein_g, base_carbs_g, base_fat_g,
  has_customisation, is_available, data_source, display_order
) values
  ('aaaaaaaa-0000-0000-0000-000000000001',
   '99999999-0000-0000-0000-000000000001',
   'Kebab',
   'Choose a wrap, main, vegetables, sauce, add-ons and toppings.',
   'Customise', 0, 0.0, 0.0, 0.0, true, true, 'verified', 0),

  ('aaaaaaaa-0000-0000-0000-000000000002',
   '99999999-0000-0000-0000-000000000001',
   'Burrito',
   'Same fillings as the Kebab, rolled into a burrito.',
   'Customise', 0, 0.0, 0.0, 0.0, true, true, 'verified', 1),

  ('aaaaaaaa-0000-0000-0000-000000000003',
   '99999999-0000-0000-0000-000000000001',
   'Quesadilla',
   'Grilled tortilla filled with your choice of main and toppings.',
   'Customise', 0, 0.0, 0.0, 0.0, true, true, 'verified', 2),

  ('aaaaaaaa-0000-0000-0000-000000000004',
   '99999999-0000-0000-0000-000000000001',
   'Daily Bowl',
   'No wrap — your choice of main, vegetables, sauce and toppings in a bowl.',
   'Customise', 0, 0.0, 0.0, 0.0, true, true, 'verified', 3)
on conflict (id) do nothing;

-- ─── Item-specific groups: Wrap (Kebab / Burrito / Quesadilla only) ───────────
-- display_order = 0 so wrap always appears first, before restaurant-wide groups
insert into customisation_groups (id, menu_item_id, restaurant_id, name, ui_hint, min_selections, max_selections, display_order)
values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-000000000001',
   '99999999-0000-0000-0000-000000000001',
   'Choose your wrap', 'pick_one_required', 1, 1, 0),

  ('bbbbbbbb-0000-0000-0000-000000000002',
   'aaaaaaaa-0000-0000-0000-000000000002',
   '99999999-0000-0000-0000-000000000001',
   'Choose your wrap', 'pick_one_required', 1, 1, 0),

  ('bbbbbbbb-0000-0000-0000-000000000003',
   'aaaaaaaa-0000-0000-0000-000000000003',
   '99999999-0000-0000-0000-000000000001',
   'Choose your wrap', 'pick_one_required', 1, 1, 0)
on conflict (id) do nothing;

-- ─── Restaurant-wide groups (menu_item_id = null) ────────────────────────────
-- display_order >= 10 so they always follow item-specific wrap group
insert into customisation_groups (id, menu_item_id, restaurant_id, name, ui_hint, min_selections, max_selections, display_order)
values
  ('bbbbbbbb-0000-0000-0000-000000000011',
   null, '99999999-0000-0000-0000-000000000001',
   'Choose your main', 'pick_one_required', 1, 1, 10),

  ('bbbbbbbb-0000-0000-0000-000000000012',
   null, '99999999-0000-0000-0000-000000000001',
   'Vegetables', 'pick_many', 0, null, 20),

  ('bbbbbbbb-0000-0000-0000-000000000013',
   null, '99999999-0000-0000-0000-000000000001',
   'Sauce', 'pick_one', 0, 1, 30),

  ('bbbbbbbb-0000-0000-0000-000000000014',
   null, '99999999-0000-0000-0000-000000000001',
   'Add-ons', 'pick_many', 0, null, 40),

  ('bbbbbbbb-0000-0000-0000-000000000015',
   null, '99999999-0000-0000-0000-000000000001',
   'Toppings', 'pick_many', 0, null, 50)
on conflict (id) do nothing;

-- ─── Wrap options (duplicated per wrap group, same values) ───────────────────
-- Kebab wraps
insert into customisation_options (id, group_id, name,
  calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g,
  fibre_delta_g, sugar_delta_g, sat_fat_delta_g, sodium_delta_mg, display_order)
values
  ('cccccccc-0001-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'Tortilla 10"',   218, 5.0, 34.4, 6.4, 1.7, 1.1, 3.2, 533, 0),
  ('cccccccc-0001-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'Wholemeal 10"',  202, 5.9, 32.9, 5.8, 3.0, 0.0, 2.7, 310, 1),
  ('cccccccc-0001-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 'Tortilla 12"',   250, 6.6, 41.1, 6.2, 2.5, 1.5, 1.5, 509, 2),
  ('cccccccc-0001-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000001', 'Wholemeal 12"',  250, 6.5, 39.6, 7.3, 3.3, 1.1, 3.7, 347, 3)
on conflict (id) do nothing;

-- Burrito wraps
insert into customisation_options (id, group_id, name,
  calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g,
  fibre_delta_g, sugar_delta_g, sat_fat_delta_g, sodium_delta_mg, display_order)
values
  ('cccccccc-0002-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002', 'Tortilla 10"',   218, 5.0, 34.4, 6.4, 1.7, 1.1, 3.2, 533, 0),
  ('cccccccc-0002-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'Wholemeal 10"',  202, 5.9, 32.9, 5.8, 3.0, 0.0, 2.7, 310, 1),
  ('cccccccc-0002-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000002', 'Tortilla 12"',   250, 6.6, 41.1, 6.2, 2.5, 1.5, 1.5, 509, 2),
  ('cccccccc-0002-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000002', 'Wholemeal 12"',  250, 6.5, 39.6, 7.3, 3.3, 1.1, 3.7, 347, 3)
on conflict (id) do nothing;

-- Quesadilla wraps
insert into customisation_options (id, group_id, name,
  calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g,
  fibre_delta_g, sugar_delta_g, sat_fat_delta_g, sodium_delta_mg, display_order)
values
  ('cccccccc-0003-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000003', 'Tortilla 10"',   218, 5.0, 34.4, 6.4, 1.7, 1.1, 3.2, 533, 0),
  ('cccccccc-0003-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000003', 'Wholemeal 10"',  202, 5.9, 32.9, 5.8, 3.0, 0.0, 2.7, 310, 1),
  ('cccccccc-0003-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000003', 'Tortilla 12"',   250, 6.6, 41.1, 6.2, 2.5, 1.5, 1.5, 509, 2),
  ('cccccccc-0003-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000003', 'Wholemeal 12"',  250, 6.5, 39.6, 7.3, 3.3, 1.1, 3.7, 347, 3)
on conflict (id) do nothing;

-- ─── Restaurant-wide options — Main ──────────────────────────────────────────
insert into customisation_options (id, group_id, name,
  calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g,
  fibre_delta_g, sugar_delta_g, sat_fat_delta_g, sodium_delta_mg, display_order)
values
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000011', 'Chicken',                  224, 16.5,  6.8, 14.3, 3.0, 3.2, 4.0, 420, 0),
  ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000011', 'Chicken Rendang',          210, 23.0,  5.8,  9.5, 0.3, 3.9, 5.9, 545, 1),
  ('dddddddd-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000011', 'Beef',                     191, 11.2,  4.6,  0.4, 0.7, 2.0, 4.1, 342, 2),
  ('dddddddd-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000011', 'Salmon',                    82, 12.8,  0.0,  3.0, 0.0, 0.0, 0.7, 549, 3),
  ('dddddddd-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000011', 'Ultimate Chicken / Beef',  289, 21.6, 14.5, 16.4, 4.2, 7.5, 5.3, 555, 4),
  ('dddddddd-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000011', 'Vegetarian — Guacamole',    89,  1.2,  5.4,  7.9, 3.8, 0.8, 1.1, 199, 5),
  ('dddddddd-0000-0000-0000-000000000007', 'bbbbbbbb-0000-0000-0000-000000000011', 'Vegetarian — Hummus',       89,  2.4, 10.0,  4.3, 2.0, 0.1, 0.6, 121, 6)
on conflict (id) do nothing;

-- ─── Restaurant-wide options — Vegetables ────────────────────────────────────
insert into customisation_options (id, group_id, name,
  calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g,
  fibre_delta_g, sugar_delta_g, sat_fat_delta_g, sodium_delta_mg, display_order)
values
  ('dddddddd-0000-0000-0000-000000000010', 'bbbbbbbb-0000-0000-0000-000000000012', 'Iceberg Lettuce',  3,  0.2, 0.6, 0.0, 0.2, 0.4, 0.0,   2, 0),
  ('dddddddd-0000-0000-0000-000000000011', 'bbbbbbbb-0000-0000-0000-000000000012', 'Cabbage',          6,  0.3, 1.5, 0.0, 0.4, 0.8, 0.0,   5, 1),
  ('dddddddd-0000-0000-0000-000000000012', 'bbbbbbbb-0000-0000-0000-000000000012', 'Tomatoes',         2,  0.1, 0.4, 0.0, 0.1, 0.3, 0.0,   1, 2),
  ('dddddddd-0000-0000-0000-000000000013', 'bbbbbbbb-0000-0000-0000-000000000012', 'Cucumbers',        3,  0.2, 0.6, 0.0, 0.2, 0.4, 0.0,   2, 3),
  ('dddddddd-0000-0000-0000-000000000014', 'bbbbbbbb-0000-0000-0000-000000000012', 'Onions',          12,  0.3, 2.8, 0.0, 0.5, 1.3, 0.0,   1, 4),
  ('dddddddd-0000-0000-0000-000000000015', 'bbbbbbbb-0000-0000-0000-000000000012', 'Tomato Salsa',     9,  0.4, 2.1, 0.1, 0.5, 1.2, 0.0, 390, 5),
  ('dddddddd-0000-0000-0000-000000000016', 'bbbbbbbb-0000-0000-0000-000000000012', 'Sour Cream',      43,  0.6, 0.9, 4.2, 0.0, 0.0, 2.6,  11, 6)
on conflict (id) do nothing;

-- ─── Restaurant-wide options — Sauce ─────────────────────────────────────────
insert into customisation_options (id, group_id, name,
  calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g,
  fibre_delta_g, sugar_delta_g, sat_fat_delta_g, sodium_delta_mg, display_order)
values
  ('dddddddd-0000-0000-0000-000000000020', 'bbbbbbbb-0000-0000-0000-000000000013', 'Yuzu Sesame',       70,  0.4, 2.5,  5.1, 5.7, 3.2, 0.8, 279, 0),
  ('dddddddd-0000-0000-0000-000000000021', 'bbbbbbbb-0000-0000-0000-000000000013', 'Wasabi Mayo',       76,  0.3, 2.1,  7.4, 0.1, 0.4, 1.2, 233, 1),
  ('dddddddd-0000-0000-0000-000000000022', 'bbbbbbbb-0000-0000-0000-000000000013', 'Habanero',          15,  0.4, 3.3,  0.1, 0.3, 1.4, 0.0, 317, 2),
  ('dddddddd-0000-0000-0000-000000000023', 'bbbbbbbb-0000-0000-0000-000000000013', 'Honey Mustard',    114,  0.0, 5.1, 10.5, 1.0, 4.1, 0.0, 135, 3),
  ('dddddddd-0000-0000-0000-000000000024', 'bbbbbbbb-0000-0000-0000-000000000013', 'Sweet Thai Sauce',  30,  0.0, 0.7,  0.0, 0.0, 0.6, 0.0, 205, 4),
  ('dddddddd-0000-0000-0000-000000000025', 'bbbbbbbb-0000-0000-0000-000000000013', 'Smoky BBQ',         16,  0.4, 2.6,  0.4, 0.2, 0.8, 0.1, 163, 5),
  ('dddddddd-0000-0000-0000-000000000026', 'bbbbbbbb-0000-0000-0000-000000000013', 'Mayo Cucumber',     73,  0.1, 0.7,  7.9, 0.1, 0.3, 1.2,  57, 6),
  ('dddddddd-0000-0000-0000-000000000027', 'bbbbbbbb-0000-0000-0000-000000000013', 'Mayonnaise',       120,  0.4, 3.6, 11.6, 0.0, 0.0, 3.0, 138, 7),
  ('dddddddd-0000-0000-0000-000000000028', 'bbbbbbbb-0000-0000-0000-000000000013', 'Roasted Sesame',    84,  0.1, 3.8,  7.3, 0.0, 0.0, 0.0,   0, 8)
on conflict (id) do nothing;

-- ─── Restaurant-wide options — Add-ons ───────────────────────────────────────
insert into customisation_options (id, group_id, name,
  calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g,
  fibre_delta_g, sugar_delta_g, sat_fat_delta_g, sodium_delta_mg, display_order)
values
  ('dddddddd-0000-0000-0000-000000000030', 'bbbbbbbb-0000-0000-0000-000000000014', 'Guacamole',  89, 1.2,  5.4, 7.9, 3.8, 0.8, 1.1, 199, 0),
  ('dddddddd-0000-0000-0000-000000000031', 'bbbbbbbb-0000-0000-0000-000000000014', 'Hummus',     89, 2.4, 10.0, 4.3, 2.0, 0.1, 0.6, 121, 1),
  ('dddddddd-0000-0000-0000-000000000032', 'bbbbbbbb-0000-0000-0000-000000000014', 'Cheese',     67, 4.4,  0.6, 5.2, 0.0, 0.5, 3.3, 148, 2)
on conflict (id) do nothing;

-- ─── Restaurant-wide options — Toppings ──────────────────────────────────────
insert into customisation_options (id, group_id, name,
  calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g,
  fibre_delta_g, sugar_delta_g, sat_fat_delta_g, sodium_delta_mg, display_order)
values
  ('dddddddd-0000-0000-0000-000000000040', 'bbbbbbbb-0000-0000-0000-000000000015', 'Creamy Macaroni',      73,  1.9, 11.8, 2.1, 0.5, 1.4, 0.3, 143,  0),
  ('dddddddd-0000-0000-0000-000000000041', 'bbbbbbbb-0000-0000-0000-000000000015', 'Black Pepper Quinoa',  55,  1.8,  8.9, 1.7, 0.8, 1.5, 0.2, 191,  1),
  ('dddddddd-0000-0000-0000-000000000042', 'bbbbbbbb-0000-0000-0000-000000000015', 'Seaweed Wakame',       62,  1.6,  5.8, 3.7, 0.3, 3.3, 0.3, 515,  2),
  ('dddddddd-0000-0000-0000-000000000043', 'bbbbbbbb-0000-0000-0000-000000000015', 'Smoky Egg Mayo',      101,  4.6,  4.4, 7.3, 0.0, 2.2, 1.6, 155,  3),
  ('dddddddd-0000-0000-0000-000000000044', 'bbbbbbbb-0000-0000-0000-000000000015', 'Teriyaki Eggplant',    13,  0.4,  1.7, 0.6, 0.6, 1.1, 0.1, 219,  4),
  ('dddddddd-0000-0000-0000-000000000045', 'bbbbbbbb-0000-0000-0000-000000000015', 'Sauteed Carrot',       36,  0.7,  4.0, 2.0, 0.9, 1.5, 0.3,  41,  5),
  ('dddddddd-0000-0000-0000-000000000046', 'bbbbbbbb-0000-0000-0000-000000000015', 'Broccoli',             22,  0.9,  2.8, 1.1, 1.3, 0.5, 0.2, 116,  6),
  ('dddddddd-0000-0000-0000-000000000047', 'bbbbbbbb-0000-0000-0000-000000000015', 'Edamame',              59,  5.2,  4.4, 2.7, 1.7, 0.0, 0.3, 394,  7),
  ('dddddddd-0000-0000-0000-000000000048', 'bbbbbbbb-0000-0000-0000-000000000015', 'Soba',                176,  6.4, 35.8, 0.9, 1.9, 32.4,0.3, 360,  8),
  ('dddddddd-0000-0000-0000-000000000049', 'bbbbbbbb-0000-0000-0000-000000000015', 'Butter Corn',          76,  1.6, 10.8, 3.9, 1.1, 1.3, 2.3, 390,  9),
  ('dddddddd-0000-0000-0000-000000000050', 'bbbbbbbb-0000-0000-0000-000000000015', 'Mashed Potato',        77,  0.7,  5.9, 6.0, 0.7, 0.5, 3.7,   1, 10),
  ('dddddddd-0000-0000-0000-000000000051', 'bbbbbbbb-0000-0000-0000-000000000015', 'Couscous',             68,  1.9, 11.6, 1.4, 0.4, 0.0, 0.2, 196, 11),
  ('dddddddd-0000-0000-0000-000000000052', 'bbbbbbbb-0000-0000-0000-000000000015', 'Black Beans',          73,  4.3, 13.4, 0.9, 3.6, 3.2, 0.2,  31, 12),
  ('dddddddd-0000-0000-0000-000000000053', 'bbbbbbbb-0000-0000-0000-000000000015', 'Cilantro Rice',        78,  1.6, 11.7, 2.9, 0.9, 1.7, 0.4,  79, 13)
on conflict (id) do nothing;
