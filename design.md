# Food for Thought — Product Design Document
**Version:** 1.1  
**Last Updated:** April 2026  
**Author:** Solo Developer  
**Target Market:** Singapore working adults

---

## 1. Product Overview

### Vision
Food for Thought is a mobile-first web app that helps Singapore's working population make informed nutritional decisions when eating out — without the cognitive overhead of logging meals or tracking calories over time.

### Problem Statement
Most working adults in Singapore rely on salad shops and health-conscious restaurant chains for a quick, "healthy" lunch. However, very few of these places surface clear nutritional information. Even when menus are customisable (pick your base, protein, toppings, dressing), the nutrition math is invisible. Users are left guessing.

### Solution
A lightweight browse-first app that lets users look up a restaurant, explore its menu, build their customised meal, and immediately see the nutritional breakdown — all in under 30 seconds.

### Core Principles
- **No sign-up required to browse.** Friction to get a nutrition answer must be near-zero.
- **No meal logging — ever.** This is a lookup tool, not a tracking tool.
- **Admin dashboard is the only gated area** — for data quality review and approval.
- **Images are never stored.** Photos submitted for crowdsourcing are processed by AI and immediately discarded. Only the extracted numbers and description are persisted.

---

## 2. Target Audience

**Primary:** Singapore-based working adults, 25–40, who eat out for lunch on weekdays and are health-conscious but time-poor.

**Use context:** Standing in a queue, or deciding where to go for lunch. Phone in hand. Wants a quick answer in under 30 seconds.

**Secondary (later):** Restaurant owners who want to publish verified nutrition data for their own venue.

---

## 3. Scope: Version 1

### In Scope
- Browse restaurants (health/salad chains first, expanding over time)
- View menu items with nutritional info
- Build a customisable meal using a flexible, generic meal builder with live nutrition totals
- Crowdsourced nutrition submissions: user submits photo + order text → AI extracts numbers → admin reviews → numbers go live
- Admin dashboard for reviewing and approving crowdsourced submissions
- Aggregated community estimates (mean across multiple submissions, with submission count shown)

### Out of Scope (v1)
- User accounts or login (for regular users)
- Meal logging and history
- Daily calorie or macro tracking
- Image storage (photos are processed and discarded)
- Hawker centre stalls (too unstructured — phase 2)
- Restaurant owner self-serve portal (phase 2)
- Native mobile app (PWA is sufficient for v1)

---

## 4. Tech Stack

**Chosen for solo developer, fast iteration, and minimal cost.**

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js (React) | Full-stack in one repo, PWA support, fast deploys |
| Backend | Next.js API routes | Co-located with frontend, no separate server |
| Database | PostgreSQL via Supabase | Free tier, managed, built-in auth |
| File storage | Not used in v1 | Images are never stored — processed and discarded |
| AI | Anthropic Claude API (claude-sonnet) | Vision + text for nutrition estimation |
| Admin auth | Supabase Auth (email/password) | Simple, secure, free tier |
| Hosting | Vercel | Free tier, auto-deploys from GitHub |

### Supabase Free Tier Notes
- 500MB database storage — more than sufficient for v1
- 50,000 monthly active users
- Projects pause after 1 week of inactivity (dev only — upgrade to Pro ~USD 25/mo when live users arrive)
- No file storage needed since images are not persisted

### Estimated v1 Cost
- Vercel: Free
- Supabase: Free
- Claude API: Pay-per-use (~USD 0.01–0.05 per crowdsource submission estimated)
- **Total: ~SGD 0 until real user volume**

---

## 5. Restaurant Data Strategy

### Tier 1 — Verified Data (Manually Curated)
Admin-entered data for health/salad chains where nutrition info is publicly available or obtained directly. Launch with 5–8 chains:

- SaladStop
- Grain
- Nourish Bowl
- Subway (nutrition publicly available)
- Shake Shack (partial)

Items and customisation options are fully structured (see Data Model). Shown with a **✅ Verified** badge.

### Tier 2 — AI-Estimated, Community Aggregated
For restaurants without verified data:
1. User submits a photo + what they ordered (text description)
2. API sends image + text to Claude Vision — **image is immediately discarded after the API call**
3. AI returns estimated nutritional numbers + confidence score
4. Numbers are stored against the submission record (not the image)
5. Submission enters admin review queue
6. Admin approves, edits, or rejects
7. Approved submissions are aggregated: **mean values across all approved submissions for the same dish**
8. Surfaced in app as **"🔶 Community estimate — based on N submissions"**

Aggregation builds confidence over time. A dish with 1 submission is labelled "early estimate." A dish with 5+ converging submissions is labelled "community verified."

### Tier 3 — Listed, No Data
Restaurants can be listed with name and basic info, showing a **"Be the first to submit"** prompt. Useful for discoverability before data is available.

---

## 6. Data Model

### Restaurant
```sql
restaurants
  id              uuid PRIMARY KEY
  name            text NOT NULL
  slug            text UNIQUE NOT NULL
  cuisine_tags    text[]           -- e.g. ["salad", "bowls", "healthy"]
  location_tags   text[]           -- e.g. ["CBD", "Orchard", "Island-wide"]
  logo_url        text
  website_url     text
  is_chain        boolean DEFAULT true
  tier            int DEFAULT 3    -- 1=verified, 2=community, 3=no data
  created_at      timestamptz DEFAULT now()
```

### Menu Item
A dish or orderable item at a restaurant. May be fixed (no customisation) or the starting point for a customisable meal.

```sql
menu_items
  id                  uuid PRIMARY KEY
  restaurant_id       uuid REFERENCES restaurants
  name                text NOT NULL
  description         text
  category            text           -- e.g. "Salads", "Bowls", "Burgers", "Set Meals"
  
  -- Base nutrition (before any customisations are applied)
  base_calories       int
  base_protein_g      numeric(6,1)
  base_carbs_g        numeric(6,1)
  base_fat_g          numeric(6,1)
  base_fibre_g        numeric(6,1)
  base_sugar_g        numeric(6,1)
  base_sat_fat_g      numeric(6,1)
  base_sodium_mg      int
  -- Tier 3 fields: stored but not surfaced in v1 UI
  base_cholesterol_mg int
  base_trans_fat_g    numeric(6,1)
  base_calcium_mg     int
  base_iron_mg        numeric(5,1)

  has_customisation   boolean DEFAULT false
  is_available        boolean DEFAULT true
  data_source         text CHECK (data_source IN ('verified','ai_estimate','crowdsourced'))
  display_order       int DEFAULT 0
  created_at          timestamptz DEFAULT now()
```

### Customisation Group
A logical grouping of choices for a menu item (or restaurant-wide add-ons). Flexible enough to model any restaurant type.

```sql
customisation_groups
  id              uuid PRIMARY KEY
  menu_item_id    uuid REFERENCES menu_items  -- null = applies restaurant-wide
  restaurant_id   uuid REFERENCES restaurants -- always set (for restaurant-wide groups)
  name            text NOT NULL    -- e.g. "Choose your base", "Size", "Add-ons", "Sauce"
  ui_hint         text NOT NULL CHECK (ui_hint IN ('pick_one','pick_many','pick_one_required'))
  min_selections  int DEFAULT 0    -- 0 = optional, 1 = required
  max_selections  int              -- 1 = single select, >1 = multi-select, null = unlimited
  display_order   int DEFAULT 0
```

**ui_hint guide:**
- `pick_one_required` → radio group, user must select exactly 1 (e.g. Size, Base)
- `pick_one` → radio group, optional (e.g. Sauce — skip if not wanted)
- `pick_many` → checkboxes (e.g. Toppings, Extras)

### Customisation Option
An individual choice within a group. Nutritional values are **deltas** — they are added to (or subtracted from) the base item values.

```sql
customisation_options
  id                  uuid PRIMARY KEY
  group_id            uuid REFERENCES customisation_groups
  name                text NOT NULL    -- e.g. "Brown Rice", "Large", "Add Egg", "No Dressing"

  -- Nutritional deltas (positive or negative, relative to base item)
  calories_delta      int DEFAULT 0
  protein_delta_g     numeric(6,1) DEFAULT 0
  carbs_delta_g       numeric(6,1) DEFAULT 0
  fat_delta_g         numeric(6,1) DEFAULT 0
  fibre_delta_g       numeric(6,1) DEFAULT 0
  sugar_delta_g       numeric(6,1) DEFAULT 0
  sat_fat_delta_g     numeric(6,1) DEFAULT 0
  sodium_delta_mg     int DEFAULT 0

  price_delta_sgd     numeric(5,2)     -- optional, for future use
  is_available        boolean DEFAULT true
  display_order       int DEFAULT 0
```

**How different restaurant types map to this model:**

| Restaurant Type | menu_item | groups | options |
|---|---|---|---|
| SaladStop build-your-own | "Build Your Own Bowl" | Base (pick_one_required), Protein (pick_one_required), Toppings (pick_many, max 5), Dressing (pick_one) | Brown Rice, Quinoa, Grilled Chicken… |
| Chicken rice stall | "Chicken Rice" | Size (pick_one_required), Extras (pick_many) | Small/Medium/Large, Extra Chilli, Extra Sauce |
| Subway | "6-inch Italian BMT" | Bread (pick_one_required), Extras (pick_many), Sauce (pick_many) | Italian, Wheat, Lettuce, Tomato… |
| Café set meal | "Grilled Chicken Set" | Side (pick_one_required), Drink (pick_one_required) | Garden Salad/Fries, Water/Juice/Coke |
| Fixed dish | "Nasi Lemak" | (none — has_customisation = false) | (none) |

No code changes are needed to support a new restaurant type — just new data rows.

### Crowdsource Submission
Images are never stored. Only extracted numbers and metadata are persisted.

```sql
crowdsource_submissions
  id                      uuid PRIMARY KEY
  restaurant_id           uuid REFERENCES restaurants
  menu_item_id            uuid REFERENCES menu_items  -- null if new dish
  dish_name_raw           text    -- what user says they ordered (free text)
  order_description       text    -- full order details

  -- AI-extracted values (image processed and discarded immediately)
  ai_calories             int
  ai_protein_g            numeric(6,1)
  ai_carbs_g              numeric(6,1)
  ai_fat_g                numeric(6,1)
  ai_fibre_g              numeric(6,1)
  ai_sugar_g              numeric(6,1)
  ai_sat_fat_g            numeric(6,1)
  ai_sodium_mg            int
  ai_confidence           numeric(3,2)   -- 0.00 to 1.00
  ai_notes                text           -- AI's explanation of assumptions

  -- Admin review
  status                  text DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','edited'))
  admin_calories          int            -- admin-overridden values (if edited)
  admin_protein_g         numeric(6,1)
  admin_carbs_g           numeric(6,1)
  admin_fat_g             numeric(6,1)
  admin_sodium_mg         int
  admin_notes             text
  reviewed_at             timestamptz

  -- Metadata
  submitter_session_id    text           -- anonymous, for spam prevention
  image_processed         boolean DEFAULT false   -- true once Claude has processed it
  created_at              timestamptz DEFAULT now()
```

### Aggregated Community Nutrition (materialised/computed)
Not a separate table — computed at query time (or cached in a view) from approved submissions:

```sql
-- View: community_dish_nutrition
SELECT
  restaurant_id,
  dish_name_raw,
  COUNT(*) as submission_count,
  ROUND(AVG(COALESCE(admin_calories, ai_calories))) as calories,
  ROUND(AVG(COALESCE(admin_protein_g, ai_protein_g)), 1) as protein_g,
  ROUND(AVG(COALESCE(admin_carbs_g, ai_carbs_g)), 1) as carbs_g,
  ROUND(AVG(COALESCE(admin_fat_g, ai_fat_g)), 1) as fat_g,
  ROUND(AVG(COALESCE(admin_sodium_mg, ai_sodium_mg))) as sodium_mg,
  MIN(created_at) as first_submitted_at,
  MAX(reviewed_at) as last_reviewed_at
FROM crowdsource_submissions
WHERE status IN ('approved', 'edited')
GROUP BY restaurant_id, dish_name_raw
```

Admin-overridden values take precedence over raw AI values (`COALESCE`).

---

## 7. Nutrition Fields — What to Show

### Tier 1: Always Displayed (Primary UI)
- **Calories** (kcal) — largest, most prominent
- **Protein** (g)
- **Total Carbohydrates** (g)
- **Total Fat** (g)

### Tier 2: Shown if Available (Secondary / Expandable)
- Dietary Fibre (g)
- Sugar (g)
- Saturated Fat (g)
- Sodium (mg) — particularly relevant given HPB's sodium awareness campaigns in Singapore

### Tier 3: Stored, Not Surfaced in v1
- Cholesterol (mg)
- Trans Fat (g)
- Calcium (mg)
- Iron (mg)

**Rationale:** Store all fields now (data entry cost is negligible). Retrofitting later means re-entering everything. Sodium is especially worth capturing — it's a growing focus for Singapore's health initiatives and a meaningful differentiator from other nutrition apps.

---

## 8. User Flows

### Flow 1: Browse & Find Nutrition (Primary)
```
Home → Search/browse restaurants
  → Restaurant page (menu categories)
    → Menu item detail (nutrition breakdown)
```
Time target: Under 30 seconds from home to seeing calorie info.

### Flow 2: Build a Custom Meal
```
Restaurant page (customisation available)
  → "Build Your Meal"
    → Generic builder: groups rendered in order, each with correct UI (radio/checkbox)
    → Live nutrition panel updates with every selection
    → Summary: total cal / protein / carbs / fat / sodium
```
The builder is fully data-driven — no hardcoded steps. Adding a new restaurant requires only data, not code.

### Flow 3: Submit a Crowdsourced Entry
```
Restaurant or dish page (no verified data)
  → "Help add this dish"
    → Photo upload (camera or gallery)
    → Text: "What did you order?" (free text)
    → Submit
      → Image sent to Claude Vision API → numbers extracted → image discarded
      → Submission stored (numbers only)
      → User sees: "Thanks! This will be reviewed before going live."
```

### Flow 4: Admin Review
```
/admin (login-gated, Supabase Auth)
  → Dashboard: pending / approved / rejected counts
  → Pending submissions list (newest first)
    → Submission detail:
        - Order description (what user said)
        - AI-extracted numbers (editable)
        - Confidence score
        - Approve / Edit & Approve / Reject
        - Admin notes
```

---

## 9. Screen-by-Screen Specification

### 9.1 Home Screen
- App name + tagline
- Search bar (by restaurant name, dish, or area)
- Filter chips: "Salads", "Bowls", "Wraps", "All"
- Restaurant cards: logo, name, cuisine tags, tier badge (✅ / 🔶 / grey)
- No location permissions required in v1 — search only

### 9.2 Restaurant Page
- Header: logo, name, tier badge
- Tab bar: "Menu" | "Build a Meal" (only if has_customisation items exist)
- Menu tab: items grouped by category, each card shows name + calorie count at a glance
- Tap item → bottom sheet with full nutrition detail
- If no data: "Be the first to submit" CTA

### 9.3 Meal Builder
- Driven entirely by customisation_groups and their options from the database
- Groups rendered in display_order
- ui_hint determines render: radio (pick_one*) or checkboxes (pick_many)
- Required groups highlighted if user tries to proceed without completing them
- Sticky bottom panel: live running total (cal / protein / carbs / fat)
- "Done" → nutrition summary screen

### 9.4 Nutrition Detail Sheet
- Item name
- Calorie count (largest element on screen)
- Macro bars: Protein (blue) / Carbs (orange) / Fat (yellow) — proportional visualisation
- Detail table: Tier 1 + Tier 2 nutrients (Tier 2 collapsed by default, "Show more" to expand)
- Data source badge: ✅ Verified | 🔶 Community estimate (N submissions)
- If community: "Help improve this" link → submission flow

### 9.5 Crowdsource Submission Screen
- Photo picker (camera or gallery, mobile-native feel)
- Text input: "What did you order? Include options/extras"
- Submit button
- Processing state: "Analysing your photo…"
- Confirmation: "Submitted! It'll be reviewed before going live."
- No stored image — processing happens server-side immediately

### 9.6 Admin Dashboard (/admin)
- Login: email + password (Supabase Auth)
- Stats row: Pending / Approved / Rejected
- Submission list: restaurant, dish name, date submitted, confidence score chip, status
- Submission detail view:
  - Order description (read-only)
  - AI-extracted values (editable number fields)
  - Confidence indicator (colour-coded: green >0.75, amber 0.5–0.75, red <0.5)
  - Admin notes text area
  - Approve / Reject buttons
- On approve: submission status → 'approved', feeds into aggregation view

---

## 10. AI Integration — Nutrition Estimation

### Trigger
On crowdsource submission: image received server-side → immediately sent to Claude API → numbers extracted → image discarded → submission record created with numbers only.

### Model
Use `claude-sonnet-4-20250514` (latest Sonnet — good vision capability, cost-effective).

### System Prompt
```
You are a nutrition estimation assistant specialising in Singapore food.
Given a photo of a meal and a text description of what was ordered, estimate the
nutritional content as accurately as possible.

Return ONLY a valid JSON object — no preamble, no markdown, no explanation outside the JSON:
{
  "calories": <integer>,
  "protein_g": <number to 1 decimal>,
  "carbs_g": <number to 1 decimal>,
  "fat_g": <number to 1 decimal>,
  "fibre_g": <number to 1 decimal>,
  "sugar_g": <number to 1 decimal>,
  "sat_fat_g": <number to 1 decimal>,
  "sodium_mg": <integer>,
  "confidence": <number 0.0 to 1.0>,
  "notes": "<brief explanation of assumptions, portion size estimate, uncertainty>"
}

Base estimates on standard Singapore portion sizes where applicable.
If the image is unclear or insufficient, lower the confidence score accordingly.
```

### Confidence Routing
| Confidence | Action |
|---|---|
| > 0.75 | Show in app as community estimate after admin approval |
| 0.50–0.75 | Show with "Low confidence" label after admin approval |
| < 0.50 | Flag prominently in admin queue — admin should scrutinise carefully before approving |

### Image Handling in Code
```javascript
// Server-side API route (Next.js)
export async function POST(req) {
  const formData = await req.formData();
  const image = formData.get('image');
  const orderDescription = formData.get('order_description');

  // Convert to base64 for Claude API
  const buffer = Buffer.from(await image.arrayBuffer());
  const base64Image = buffer.toString('base64');
  const mediaType = image.type; // e.g. 'image/jpeg'

  // Send to Claude — image never touches disk or storage
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
        { type: 'text', text: `Order description: ${orderDescription}` }
      ]
    }]
  });

  // Parse response and store numbers only — image buffer is GC'd here
  const nutrition = JSON.parse(response.content[0].text);
  // → save to crowdsource_submissions table
}
```

---

## 11. Meal Builder — Calculation Logic

All calculation happens client-side. On page load, the full customisation data for a restaurant is fetched once and cached locally. No API call per selection.

```javascript
function calculateNutrition(menuItem, selectedOptions) {
  const base = {
    calories: menuItem.base_calories,
    protein_g: menuItem.base_protein_g,
    carbs_g: menuItem.base_carbs_g,
    fat_g: menuItem.base_fat_g,
    sodium_mg: menuItem.base_sodium_mg,
    // ...etc
  };

  return selectedOptions.reduce((totals, option) => ({
    calories: totals.calories + (option.calories_delta ?? 0),
    protein_g: totals.protein_g + (option.protein_delta_g ?? 0),
    carbs_g: totals.carbs_g + (option.carbs_delta_g ?? 0),
    fat_g: totals.fat_g + (option.fat_delta_g ?? 0),
    sodium_mg: totals.sodium_mg + (option.sodium_delta_mg ?? 0),
  }), base);
}
```

Result updates instantly on every selection change, no latency.

---

## 12. Phased Rollout Plan

### Phase 1 — Foundation (Weeks 1–4)
- Next.js project + Supabase setup
- Database schema + seed script
- Manually enter data for 3 restaurants (SaladStop, Grain, one more)
- Home screen, restaurant page, menu item detail sheet
- Deploy to Vercel

### Phase 2 — Meal Builder (Weeks 5–7)
- Customisation groups + options data entry for SaladStop
- Generic meal builder UI (data-driven, no hardcoded steps)
- Live nutrition calculator (client-side)
- Test with at least 2 restaurant types (modular + fixed dish)

### Phase 3 — Crowdsourcing (Weeks 8–11)
- Photo submission flow (mobile-optimised)
- Server-side Claude Vision integration (process + discard)
- Admin dashboard (Supabase Auth, review queue, approve/edit/reject)
- Community aggregation view (mean across approved submissions)
- Confidence score display in UI

### Phase 4 — Expand & Polish (Weeks 12+)
- Add more restaurant types (fast food, hawker chains, cafes)
- PWA: add-to-home-screen, offline shell
- Sodium-focused feature (HPB angle — "High/Medium/Low sodium" labels)
- Basic analytics: most-viewed restaurants and dishes (no user PII)

---

## 13. Open Questions

1. **Aggregation threshold:** How many community submissions before we show numbers to users? Recommend showing from 1 submission (labelled "early estimate") with confidence increasing visually as count grows.
2. **Spam prevention for submissions:** Limit submissions per anonymous session (e.g. max 5/day) to prevent gaming the aggregation.
3. **Allergen data:** Low-effort to add to schema now (boolean flags: contains_gluten, contains_dairy, etc.) even if not surfaced in v1. Worth adding.
4. **Hawker centres (phase 2):** These are unstructured but high-value. A crowdsource-first approach (no verified tier) may work well here.
5. **Restaurant owner onboarding:** Direct outreach to chains for Tier 1 data? Scrape public PDFs (SFA nutrition labels, restaurant websites)? Wait for inbound? Likely all three.

---

## 14. Success Metrics (v1)

- Users can get a calorie number in under 30 seconds from opening the app
- 8+ restaurants with nutrition data live at launch
- Meal builder works correctly for at least 2 structurally different restaurant types
- At least 1 approved community submission within 2 weeks of going live
- Zero images stored at any point

---

*End of Document — v1.1*
