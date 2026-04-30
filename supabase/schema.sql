-- Food for Thought — Database Schema v1
-- Run this in the Supabase SQL Editor before seeding

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── Restaurants ─────────────────────────────────────────────────────────────
create table if not exists restaurants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,
  cuisine_tags  text[] default '{}',
  location_tags text[] default '{}',
  logo_url      text,
  website_url   text,
  is_chain      boolean default true,
  tier          int default 3 check (tier in (1, 2, 3)),
  created_at    timestamptz default now()
);

-- ─── Menu Items ───────────────────────────────────────────────────────────────
create table if not exists menu_items (
  id                  uuid primary key default gen_random_uuid(),
  restaurant_id       uuid references restaurants on delete cascade,
  name                text not null,
  description         text,
  category            text not null,
  base_calories       int,
  base_protein_g      numeric(6,1),
  base_carbs_g        numeric(6,1),
  base_fat_g          numeric(6,1),
  base_fibre_g        numeric(6,1),
  base_sugar_g        numeric(6,1),
  base_sat_fat_g      numeric(6,1),
  base_sodium_mg      int,
  base_cholesterol_mg int,
  base_trans_fat_g    numeric(6,1),
  base_calcium_mg     int,
  base_iron_mg        numeric(5,1),
  has_customisation   boolean default false,
  is_available        boolean default true,
  data_source         text check (data_source in ('verified','ai_estimate','crowdsourced')),
  display_order       int default 0,
  created_at          timestamptz default now()
);

-- ─── Customisation Groups ────────────────────────────────────────────────────
create table if not exists customisation_groups (
  id            uuid primary key default gen_random_uuid(),
  menu_item_id  uuid references menu_items on delete cascade,
  restaurant_id uuid references restaurants on delete cascade not null,
  name          text not null,
  ui_hint       text not null check (ui_hint in ('pick_one','pick_many','pick_one_required')),
  min_selections int default 0,
  max_selections int,
  display_order  int default 0
);

-- ─── Customisation Options ───────────────────────────────────────────────────
create table if not exists customisation_options (
  id              uuid primary key default gen_random_uuid(),
  group_id        uuid references customisation_groups on delete cascade,
  name            text not null,
  calories_delta  int default 0,
  protein_delta_g numeric(6,1) default 0,
  carbs_delta_g   numeric(6,1) default 0,
  fat_delta_g     numeric(6,1) default 0,
  fibre_delta_g   numeric(6,1) default 0,
  sugar_delta_g   numeric(6,1) default 0,
  sat_fat_delta_g numeric(6,1) default 0,
  sodium_delta_mg int default 0,
  price_delta_sgd numeric(5,2),
  is_available    boolean default true,
  display_order   int default 0
);

-- ─── Crowdsource Submissions ─────────────────────────────────────────────────
create table if not exists crowdsource_submissions (
  id                    uuid primary key default gen_random_uuid(),
  restaurant_id         uuid references restaurants,
  menu_item_id          uuid references menu_items,
  dish_name_raw         text,
  order_description     text,
  ai_calories           int,
  ai_protein_g          numeric(6,1),
  ai_carbs_g            numeric(6,1),
  ai_fat_g              numeric(6,1),
  ai_fibre_g            numeric(6,1),
  ai_sugar_g            numeric(6,1),
  ai_sat_fat_g          numeric(6,1),
  ai_sodium_mg          int,
  ai_confidence         numeric(3,2),
  ai_notes              text,
  status                text default 'pending'
                        check (status in ('pending','approved','rejected','edited')),
  admin_calories        int,
  admin_protein_g       numeric(6,1),
  admin_carbs_g         numeric(6,1),
  admin_fat_g           numeric(6,1),
  admin_sodium_mg       int,
  admin_notes           text,
  reviewed_at           timestamptz,
  submitter_session_id  text,
  image_processed       boolean default false,
  created_at            timestamptz default now()
);

-- ─── Community Nutrition View ────────────────────────────────────────────────
create or replace view community_dish_nutrition as
select
  restaurant_id,
  dish_name_raw,
  count(*) as submission_count,
  round(avg(coalesce(admin_calories, ai_calories))) as calories,
  round(avg(coalesce(admin_protein_g, ai_protein_g)), 1) as protein_g,
  round(avg(coalesce(admin_carbs_g, ai_carbs_g)), 1) as carbs_g,
  round(avg(coalesce(admin_fat_g, ai_fat_g)), 1) as fat_g,
  round(avg(coalesce(admin_sodium_mg, ai_sodium_mg))) as sodium_mg,
  min(created_at) as first_submitted_at,
  max(reviewed_at) as last_reviewed_at
from crowdsource_submissions
where status in ('approved', 'edited')
group by restaurant_id, dish_name_raw;

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists idx_menu_items_restaurant on menu_items(restaurant_id);
create index if not exists idx_customisation_groups_item on customisation_groups(menu_item_id);
create index if not exists idx_customisation_groups_restaurant on customisation_groups(restaurant_id);
create index if not exists idx_customisation_options_group on customisation_options(group_id);
create index if not exists idx_submissions_restaurant on crowdsource_submissions(restaurant_id);
create index if not exists idx_submissions_status on crowdsource_submissions(status);
