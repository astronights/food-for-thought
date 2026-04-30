-- Food for Thought — Seed Data v1
-- Run AFTER schema.sql
-- Seeds 3 restaurants: SaladStop, Grain, Subway

-- ─── Restaurants ─────────────────────────────────────────────────────────────
insert into restaurants (id, name, slug, cuisine_tags, location_tags, website_url, is_chain, tier) values
  ('11111111-0000-0000-0000-000000000001', 'SaladStop', 'saladstop',
   array['salad','bowls','healthy','wraps'], array['CBD','Orchard','Island-wide'],
   'https://saladstop.com.sg', true, 1),
  ('11111111-0000-0000-0000-000000000002', 'Grain', 'grain',
   array['bowls','healthy','clean eating'], array['CBD','Raffles Place','Island-wide'],
   'https://grain.com.sg', true, 1),
  ('11111111-0000-0000-0000-000000000003', 'Subway', 'subway',
   array['sandwiches','wraps','fast food'], array['Island-wide'],
   'https://subway.com', true, 1)
on conflict (id) do nothing;

-- ─── SaladStop Menu Items ─────────────────────────────────────────────────────
-- Build Your Own Bowl is the configurable base; individual premade salads are fixed items
insert into menu_items (id, restaurant_id, name, description, category,
  base_calories, base_protein_g, base_carbs_g, base_fat_g,
  base_fibre_g, base_sugar_g, base_sat_fat_g, base_sodium_mg,
  has_customisation, data_source, display_order) values
  ('22222222-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'Build Your Own Bowl',
   'Choose your base, protein, toppings, and dressing. Nutrition updates as you build.',
   'Customise',
   0, 0, 0, 0, 0, 0, 0, 0,
   true, 'verified', 0),
  ('22222222-0000-0000-0000-000000000002',
   '11111111-0000-0000-0000-000000000001',
   'Garden of Eden',
   'Mixed greens, cherry tomatoes, cucumber, avocado, sunflower seeds, balsamic',
   'Premade Salads',
   380, 9.0, 28.0, 26.0, 7.0, 8.0, 3.5, 420,
   false, 'verified', 1),
  ('22222222-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000001',
   'The Warrior',
   'Quinoa, grilled chicken, edamame, roasted peppers, feta, lemon tahini',
   'Premade Salads',
   520, 42.0, 38.0, 18.0, 6.0, 5.0, 4.0, 680,
   false, 'verified', 2),
  ('22222222-0000-0000-0000-000000000004',
   '11111111-0000-0000-0000-000000000001',
   'The Italian Job',
   'Arugula, salami, mozzarella, olives, sun-dried tomatoes, caesar dressing',
   'Premade Salads',
   480, 24.0, 18.0, 35.0, 3.0, 4.0, 10.0, 890,
   false, 'verified', 3)
on conflict (id) do nothing;

-- ─── Grain Menu Items ─────────────────────────────────────────────────────────
insert into menu_items (id, restaurant_id, name, description, category,
  base_calories, base_protein_g, base_carbs_g, base_fat_g,
  base_fibre_g, base_sugar_g, base_sat_fat_g, base_sodium_mg,
  has_customisation, data_source, display_order) values
  ('22222222-0000-0000-0000-000000000010',
   '11111111-0000-0000-0000-000000000002',
   'Grilled Chicken Bowl',
   'Brown rice, grilled chicken thigh, steamed broccoli, edamame, sesame ginger sauce',
   'Bowls',
   520, 38.0, 58.0, 12.0, 5.0, 6.0, 3.0, 720,
   false, 'verified', 0),
  ('22222222-0000-0000-0000-000000000011',
   '11111111-0000-0000-0000-000000000002',
   'Salmon Teriyaki Bowl',
   'Brown rice, grilled salmon, bok choy, edamame, teriyaki glaze, sesame seeds',
   'Bowls',
   590, 36.0, 60.0, 20.0, 4.0, 8.0, 4.0, 810,
   false, 'verified', 1),
  ('22222222-0000-0000-0000-000000000012',
   '11111111-0000-0000-0000-000000000002',
   'Tofu & Mushroom Bowl',
   'Brown rice, pan-fried tofu, shiitake mushrooms, spinach, miso glaze',
   'Bowls',
   440, 22.0, 55.0, 14.0, 6.0, 5.0, 2.0, 650,
   false, 'verified', 2),
  ('22222222-0000-0000-0000-000000000013',
   '11111111-0000-0000-0000-000000000002',
   'Beef Rendang Bowl',
   'Brown rice, slow-cooked beef rendang, cucumber, pickled onions, fresh chilli',
   'Bowls',
   640, 42.0, 62.0, 22.0, 4.0, 7.0, 8.0, 940,
   false, 'verified', 3),
  ('22222222-0000-0000-0000-000000000014',
   '11111111-0000-0000-0000-000000000002',
   'Green Goddess Salad',
   'Mixed greens, avocado, cucumber, snap peas, pumpkin seeds, green goddess dressing',
   'Salads',
   310, 9.0, 22.0, 22.0, 8.0, 6.0, 3.5, 360,
   false, 'verified', 4)
on conflict (id) do nothing;

-- ─── Subway Menu Items ────────────────────────────────────────────────────────
insert into menu_items (id, restaurant_id, name, description, category,
  base_calories, base_protein_g, base_carbs_g, base_fat_g,
  base_fibre_g, base_sugar_g, base_sat_fat_g, base_sodium_mg,
  has_customisation, data_source, display_order) values
  ('22222222-0000-0000-0000-000000000020',
   '11111111-0000-0000-0000-000000000003',
   '6-inch Italian BMT',
   'Pepperoni, salami, ham on Italian bread. Choose your bread, salad, and sauce.',
   'Subs',
   410, 22.0, 44.0, 16.0, 2.0, 6.0, 6.0, 1050,
   true, 'verified', 0),
  ('22222222-0000-0000-0000-000000000021',
   '11111111-0000-0000-0000-000000000003',
   '6-inch Grilled Chicken',
   'Tender grilled chicken strips on Italian bread. Choose your bread, salad, and sauce.',
   'Subs',
   310, 26.0, 42.0, 5.0, 2.0, 6.0, 1.5, 620,
   true, 'verified', 1),
  ('22222222-0000-0000-0000-000000000022',
   '11111111-0000-0000-0000-000000000003',
   '6-inch Tuna',
   'Tuna mixed with mayo on Italian bread. Choose your bread, salad, and sauce.',
   'Subs',
   450, 20.0, 42.0, 22.0, 2.0, 6.0, 4.0, 730,
   true, 'verified', 2),
  ('22222222-0000-0000-0000-000000000023',
   '11111111-0000-0000-0000-000000000003',
   '6-inch Veggie Delite',
   'Fresh veggies piled high on Italian bread — no meat. Choose your bread, salad, and sauce.',
   'Subs',
   230, 9.0, 42.0, 3.0, 3.0, 6.0, 0.5, 310,
   true, 'verified', 3),
  ('22222222-0000-0000-0000-000000000024',
   '11111111-0000-0000-0000-000000000003',
   'Cookies (3-pack)',
   'Freshly baked chocolate chip, double choc, or white macadamia cookies.',
   'Extras',
   570, 6.0, 78.0, 27.0, 2.0, 45.0, 12.0, 400,
   false, 'verified', 10)
on conflict (id) do nothing;

-- ─── SaladStop: Build Your Own Bowl — Customisation ──────────────────────────
-- Groups for menu_item_id = Build Your Own Bowl
insert into customisation_groups (id, menu_item_id, restaurant_id, name, ui_hint, min_selections, max_selections, display_order) values
  ('33333333-0000-0000-0000-000000000001',
   '22222222-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'Choose your base', 'pick_one_required', 1, 1, 0),
  ('33333333-0000-0000-0000-000000000002',
   '22222222-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'Choose your protein', 'pick_one_required', 1, 1, 1),
  ('33333333-0000-0000-0000-000000000003',
   '22222222-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'Toppings (up to 5)', 'pick_many', 0, 5, 2),
  ('33333333-0000-0000-0000-000000000004',
   '22222222-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000001',
   'Choose your dressing', 'pick_one', 0, 1, 3)
on conflict (id) do nothing;

-- Base options
insert into customisation_options (id, group_id, name, calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g, fibre_delta_g, sodium_delta_mg, display_order) values
  ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'Mixed Greens', 20, 1.5, 3.0, 0.3, 2.0, 25, 0),
  ('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 'Brown Rice', 210, 4.0, 44.0, 1.5, 3.0, 10, 1),
  ('44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', 'Quinoa', 220, 8.0, 39.0, 3.5, 5.0, 10, 2),
  ('44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000001', 'Soba Noodles', 200, 7.0, 40.0, 1.0, 2.0, 50, 3)
on conflict (id) do nothing;

-- Protein options
insert into customisation_options (id, group_id, name, calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g, fibre_delta_g, sodium_delta_mg, display_order) values
  ('44444444-0000-0000-0000-000000000010', '33333333-0000-0000-0000-000000000002', 'Grilled Chicken', 170, 28.0, 0.0, 5.0, 0.0, 380, 0),
  ('44444444-0000-0000-0000-000000000011', '33333333-0000-0000-0000-000000000002', 'Roasted Salmon', 200, 26.0, 0.0, 11.0, 0.0, 310, 1),
  ('44444444-0000-0000-0000-000000000012', '33333333-0000-0000-0000-000000000002', 'Falafel (3 pcs)', 190, 7.0, 18.0, 10.0, 4.0, 290, 2),
  ('44444444-0000-0000-0000-000000000013', '33333333-0000-0000-0000-000000000002', 'Tofu', 100, 10.0, 3.0, 6.0, 1.0, 10, 3),
  ('44444444-0000-0000-0000-000000000014', '33333333-0000-0000-0000-000000000002', 'Hard Boiled Egg', 70, 6.0, 0.5, 5.0, 0.0, 65, 4)
on conflict (id) do nothing;

-- Toppings
insert into customisation_options (id, group_id, name, calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g, fibre_delta_g, sodium_delta_mg, display_order) values
  ('44444444-0000-0000-0000-000000000020', '33333333-0000-0000-0000-000000000003', 'Avocado', 80, 1.0, 4.0, 7.0, 3.0, 5, 0),
  ('44444444-0000-0000-0000-000000000021', '33333333-0000-0000-0000-000000000003', 'Edamame', 50, 4.5, 4.0, 2.5, 2.0, 10, 1),
  ('44444444-0000-0000-0000-000000000022', '33333333-0000-0000-0000-000000000003', 'Cherry Tomatoes', 15, 0.5, 3.0, 0.2, 1.0, 5, 2),
  ('44444444-0000-0000-0000-000000000023', '33333333-0000-0000-0000-000000000003', 'Roasted Peppers', 25, 0.5, 5.0, 0.3, 1.0, 80, 3),
  ('44444444-0000-0000-0000-000000000024', '33333333-0000-0000-0000-000000000003', 'Corn', 35, 1.0, 7.0, 0.5, 1.0, 5, 4),
  ('44444444-0000-0000-0000-000000000025', '33333333-0000-0000-0000-000000000003', 'Feta Cheese', 80, 4.0, 1.0, 6.0, 0.0, 260, 5),
  ('44444444-0000-0000-0000-000000000026', '33333333-0000-0000-0000-000000000003', 'Sunflower Seeds', 50, 2.0, 2.0, 4.5, 0.5, 5, 6),
  ('44444444-0000-0000-0000-000000000027', '33333333-0000-0000-0000-000000000003', 'Cucumber', 5, 0.3, 1.0, 0.1, 0.3, 0, 7)
on conflict (id) do nothing;

-- Dressings
insert into customisation_options (id, group_id, name, calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g, fibre_delta_g, sodium_delta_mg, display_order) values
  ('44444444-0000-0000-0000-000000000030', '33333333-0000-0000-0000-000000000004', 'Balsamic Vinaigrette', 90, 0.0, 5.0, 8.0, 0.0, 180, 0),
  ('44444444-0000-0000-0000-000000000031', '33333333-0000-0000-0000-000000000004', 'Lemon Tahini', 120, 3.0, 6.0, 10.0, 1.0, 150, 1),
  ('44444444-0000-0000-0000-000000000032', '33333333-0000-0000-0000-000000000004', 'Caesar', 150, 2.0, 3.0, 15.0, 0.0, 350, 2),
  ('44444444-0000-0000-0000-000000000033', '33333333-0000-0000-0000-000000000004', 'Japanese Sesame', 110, 1.0, 8.0, 9.0, 0.0, 290, 3),
  ('44444444-0000-0000-0000-000000000034', '33333333-0000-0000-0000-000000000004', 'No Dressing', 0, 0.0, 0.0, 0.0, 0.0, 0, 4)
on conflict (id) do nothing;

-- ─── Subway: 6-inch Grilled Chicken — Customisation ──────────────────────────
insert into customisation_groups (id, menu_item_id, restaurant_id, name, ui_hint, min_selections, max_selections, display_order) values
  ('33333333-0000-0000-0000-000000000010',
   '22222222-0000-0000-0000-000000000021',
   '11111111-0000-0000-0000-000000000003',
   'Choose your bread', 'pick_one_required', 1, 1, 0),
  ('33333333-0000-0000-0000-000000000011',
   '22222222-0000-0000-0000-000000000021',
   '11111111-0000-0000-0000-000000000003',
   'Salad & extras', 'pick_many', 0, null, 1),
  ('33333333-0000-0000-0000-000000000012',
   '22222222-0000-0000-0000-000000000021',
   '11111111-0000-0000-0000-000000000003',
   'Sauce', 'pick_many', 0, null, 2)
on conflict (id) do nothing;

-- Bread options (calories already included in base; delta = swap from Italian)
insert into customisation_options (id, group_id, name, calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g, fibre_delta_g, sodium_delta_mg, display_order) values
  ('44444444-0000-0000-0000-000000000040', '33333333-0000-0000-0000-000000000010', 'Italian (White)', 0, 0.0, 0.0, 0.0, 0.0, 0, 0),
  ('44444444-0000-0000-0000-000000000041', '33333333-0000-0000-0000-000000000010', 'Hearty Italian', 10, 0.5, 1.5, 0.2, 0.5, 80, 1),
  ('44444444-0000-0000-0000-000000000042', '33333333-0000-0000-0000-000000000010', '9-Grain Wheat', 10, 1.0, 1.0, 0.5, 2.0, 40, 2),
  ('44444444-0000-0000-0000-000000000043', '33333333-0000-0000-0000-000000000010', 'Honey Oat', 20, 0.5, 3.0, 0.5, 1.5, 50, 3)
on conflict (id) do nothing;

-- Salad extras (all near-zero)
insert into customisation_options (id, group_id, name, calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g, fibre_delta_g, sodium_delta_mg, display_order) values
  ('44444444-0000-0000-0000-000000000050', '33333333-0000-0000-0000-000000000011', 'Lettuce', 0, 0.0, 0.0, 0.0, 0.3, 0, 0),
  ('44444444-0000-0000-0000-000000000051', '33333333-0000-0000-0000-000000000011', 'Tomatoes', 5, 0.2, 1.0, 0.1, 0.3, 0, 1),
  ('44444444-0000-0000-0000-000000000052', '33333333-0000-0000-0000-000000000011', 'Cucumber', 5, 0.2, 1.0, 0.1, 0.3, 0, 2),
  ('44444444-0000-0000-0000-000000000053', '33333333-0000-0000-0000-000000000011', 'Green Peppers', 5, 0.2, 1.0, 0.1, 0.3, 0, 3),
  ('44444444-0000-0000-0000-000000000054', '33333333-0000-0000-0000-000000000011', 'Olives', 15, 0.1, 0.5, 1.5, 0.3, 40, 4),
  ('44444444-0000-0000-0000-000000000055', '33333333-0000-0000-0000-000000000011', 'Jalapeños', 5, 0.1, 1.0, 0.1, 0.5, 110, 5),
  ('44444444-0000-0000-0000-000000000056', '33333333-0000-0000-0000-000000000011', 'Cheese', 40, 2.5, 0.5, 3.0, 0.0, 120, 6)
on conflict (id) do nothing;

-- Sauces
insert into customisation_options (id, group_id, name, calories_delta, protein_delta_g, carbs_delta_g, fat_delta_g, fibre_delta_g, sodium_delta_mg, display_order) values
  ('44444444-0000-0000-0000-000000000060', '33333333-0000-0000-0000-000000000012', 'Honey Mustard', 30, 0.3, 6.0, 0.5, 0.0, 110, 0),
  ('44444444-0000-0000-0000-000000000061', '33333333-0000-0000-0000-000000000012', 'Sweet Onion', 40, 0.0, 10.0, 0.0, 0.0, 85, 1),
  ('44444444-0000-0000-0000-000000000062', '33333333-0000-0000-0000-000000000012', 'Ranch', 80, 0.2, 2.0, 8.0, 0.0, 150, 2),
  ('44444444-0000-0000-0000-000000000063', '33333333-0000-0000-0000-000000000012', 'Chipotle Southwest', 100, 0.2, 2.0, 10.0, 0.0, 210, 3),
  ('44444444-0000-0000-0000-000000000064', '33333333-0000-0000-0000-000000000012', 'Mayonnaise', 110, 0.2, 0.5, 12.0, 0.0, 85, 4),
  ('44444444-0000-0000-0000-000000000065', '33333333-0000-0000-0000-000000000012', 'No Sauce', 0, 0.0, 0.0, 0.0, 0.0, 0, 5)
on conflict (id) do nothing;
