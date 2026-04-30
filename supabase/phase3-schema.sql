-- Phase 3 schema additions
-- Run this in the Supabase SQL Editor

-- ─── Restaurant Submissions ──────────────────────────────────────────────────
create table if not exists restaurant_submissions (
  id                    uuid primary key default gen_random_uuid(),
  restaurant_name       text not null,
  location_description  text,
  cuisine_description   text,
  ai_extracted_dishes   jsonb,        -- [{ name, category, price_sgd }]
  ai_notes              text,
  status                text default 'pending'
                        check (status in ('pending','approved','rejected')),
  admin_notes           text,
  reviewed_at           timestamptz,
  submitter_session_id  text,
  image_processed       boolean default false,
  created_at            timestamptz default now()
);

-- ─── RLS Policies ────────────────────────────────────────────────────────────
-- Allow anonymous users to submit dish nutrition
alter table crowdsource_submissions enable row level security;

create policy "Anyone can submit nutrition data"
  on crowdsource_submissions for insert
  to anon
  with check (true);

create policy "Authenticated users can manage submissions"
  on crowdsource_submissions for all
  to authenticated
  using (true);

-- Allow anonymous users to suggest restaurants
alter table restaurant_submissions enable row level security;

create policy "Anyone can suggest a restaurant"
  on restaurant_submissions for insert
  to anon
  with check (true);

create policy "Authenticated users can manage restaurant submissions"
  on restaurant_submissions for all
  to authenticated
  using (true);

-- Allow anonymous reads on restaurants and menu items (if not already done)
alter table restaurants enable row level security;
create policy "Anyone can read restaurants"
  on restaurants for select to anon using (true);
create policy "Authenticated users can manage restaurants"
  on restaurants for all to authenticated using (true);

alter table menu_items enable row level security;
create policy "Anyone can read menu items"
  on menu_items for select to anon using (true);
create policy "Authenticated users can manage menu items"
  on menu_items for all to authenticated using (true);

alter table customisation_groups enable row level security;
create policy "Anyone can read customisation groups"
  on customisation_groups for select to anon using (true);
create policy "Authenticated users can manage customisation groups"
  on customisation_groups for all to authenticated using (true);

alter table customisation_options enable row level security;
create policy "Anyone can read customisation options"
  on customisation_options for select to anon using (true);
create policy "Authenticated users can manage customisation options"
  on customisation_options for all to authenticated using (true);

-- Index for admin queue
create index if not exists idx_restaurant_submissions_status on restaurant_submissions(status);
create index if not exists idx_restaurant_submissions_created on restaurant_submissions(created_at desc);
