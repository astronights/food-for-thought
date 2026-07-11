# Food for Thought

**Nutrition info for Singapore restaurants — no sign-up required.**

A mobile-first web app that lets Singapore's working population look up nutritional information when eating out. Browse restaurants, build your meal with live calorie counts, and contribute data for restaurants that aren't listed yet.

---

## Features

- **Browse & search** restaurants with nutrition at a glance
- **Meal builder** — pick your base, protein, toppings and dressing; nutrition updates live with every selection
- **Nutrient selector** — switch the displayed metric between calories, protein, carbs, and fat
- **Crowdsourced submissions** — photo → Gemini Vision → AI extracts nutrition → admin reviews → goes live
- **Restaurant suggestions** — submit a menu photo and AI extracts the dish list automatically
- **Correction flags** — flag verified data that looks wrong; AI reads the description and suggests corrections
- **Admin dashboard** — review queue with editable nutrition fields, confidence scores, submission photos, and suggested rule changes
- **Light / dark mode**

### Data tiers

| Badge | Meaning |
|---|---|
| ✓ Emerald | Verified — official source |
| ··· Blue | Community estimate — user-submitted, admin-reviewed |
| ? Yellow | No data yet — be first to contribute |

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL via Supabase |
| AI | Google Gemini 2.5 Flash Lite |
| Styling | Tailwind CSS + shadcn/ui |
| Font | Space Grotesk |
| Hosting | Vercel |

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/astronights/food-for-thought.git
cd food-for-thought
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL Editor
3. Run `supabase/phase3-schema.sql`
4. Run a restaurant seed file (e.g. `supabase/supergreen-seed.sql`)
5. Go to **Project Settings → Data API** and copy your Project URL and publishable key
6. Go to **Storage** and create a private bucket named `submission-images`

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
```

Get a Gemini API key at [aistudio.google.com](https://aistudio.google.com).

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Admin account

Create a user in Supabase → Authentication → Users. Sign in at `/admin/login`.

---

## Restaurant data

Source menu PDFs go in `data/` (gitignored). Seed SQL files live in `supabase/`.

Two restaurants ship with the repo:

- **Supergreen** — 7 signature bowls + Build Your Own Bowl (`supabase/supergreen-seed.sql`)
- **Stuff'd** — Kebab, Burrito, Quesadilla, Daily Bowl with shared ingredient groups (`supabase/stuffd-seed.sql`)

---

## Project structure

```
app/
├── page.tsx                      # Home — restaurant list
├── restaurants/[slug]/
│   ├── page.tsx                  # Restaurant menu
│   └── build/[itemId]/page.tsx   # Meal builder
├── admin/                        # Admin dashboard (auth-gated)
└── api/                          # Submission + admin API routes
components/
├── meal-builder-client.tsx       # Live nutrition calculator
├── nutrition-sheet.tsx           # Nutrition detail bottom sheet
├── contribute-dish-sheet.tsx     # Photo submission flow
├── flag-correction-sheet.tsx     # Correction flag flow
└── admin-dashboard-client.tsx    # Admin review queue
lib/
├── gemini.ts                     # Gemini Vision + text extraction
├── nutrition.ts                  # Client-side nutrition calculator
└── types.ts                      # Shared TypeScript types
supabase/
├── schema.sql                    # Database schema
├── phase3-schema.sql             # Crowdsource tables + RLS policies
├── supergreen-seed.sql           # Supergreen restaurant data
└── stuffd-seed.sql               # Stuff'd restaurant data
```

---

## Deployment

Push to `main` and Vercel deploys automatically. Add the four environment variables in Vercel → Project Settings → Environment Variables.

---

*Built for Singapore's working lunch crowd.*

