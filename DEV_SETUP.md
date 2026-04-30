# Developer Setup Guide — Food for Thought

## Prerequisites
- Node.js 20+
- A Supabase account (free): https://supabase.com
- A Google AI Studio account (free): https://aistudio.google.com

---

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd food-for-thought
npm install
```

---

## 2. Set Up Supabase

### 2a. Create a project
1. Go to https://supabase.com and sign in.
2. Click **New Project**.
3. Choose an organisation, give the project a name (e.g. `food-for-thought`), set a strong database password, and choose the **Singapore (Southeast Asia)** region.
4. Click **Create new project** and wait ~1 minute for provisioning.

### 2b. Run the schema
1. In your Supabase dashboard, go to **SQL Editor** (left sidebar).
2. Click **New query**.
3. Paste the contents of `supabase/schema.sql` and click **Run**.
4. You should see "Success. No rows returned."

### 2c. Seed the database
1. In the same SQL Editor, open another new query.
2. Paste the contents of `supabase/seed.sql` and click **Run**.
3. You should see "Success. No rows returned."
4. Verify by going to **Table Editor** → `restaurants` — you should see SaladStop, Grain, and Subway.

### 2d. Get your API keys
1. Go to **Project Settings** → **Data API** (or **API**).
2. Copy:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long JWT string

### 2e. Disable Row Level Security (for development only)
By default Supabase enables RLS, which will block all reads until you add policies.
For local development, run this in the SQL Editor:

```sql
alter table restaurants disable row level security;
alter table menu_items disable row level security;
alter table customisation_groups disable row level security;
alter table customisation_options disable row level security;
alter table crowdsource_submissions disable row level security;
```

> **Before going to production**, re-enable RLS and add appropriate policies.
> At minimum: public `SELECT` on restaurants/menu_items, `INSERT` on crowdsource_submissions,
> and authenticated-only access for admin operations.

---

## 3. Set Up Google Gemini

The app uses **Gemini Flash** for nutrition estimation from photos (Phase 3 — crowdsource feature).

### 3a. Get an API key
1. Go to https://aistudio.google.com.
2. Sign in with your Google account.
3. Click **Get API key** → **Create API key**.
4. Copy the key.

### 3b. Model to use
The app is configured to use **`gemini-2.0-flash`**. This model:
- Has vision capability (can analyse food photos)
- Is fast and cost-effective (~$0.075 per 1M input tokens)
- Is available on the free tier with rate limits

You can swap to `gemini-1.5-flash` if needed — update `lib/gemini.ts` when it's created in Phase 3.

---

## 4. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
GEMINI_API_KEY=your-gemini-api-key-here
```

---

## 5. Run Locally

```bash
npm run dev
```

Open http://localhost:3000. You should see the home screen with SaladStop, Grain, and Subway listed.

---

## 6. Deploy to Vercel

1. Push your repo to GitHub.
2. Go to https://vercel.com → **Add New Project** → import your repo.
3. In the **Environment Variables** section, add the same three variables from `.env.local`.
4. Click **Deploy**.

Vercel will auto-deploy on every push to `main`.

---

## Project Structure

```
food-for-thought/
├── app/
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home — restaurant list
│   └── restaurants/[slug]/
│       └── page.tsx             # Restaurant detail + menu
├── components/
│   ├── home-client.tsx          # Search + filter (client)
│   ├── restaurant-card.tsx      # Card on home screen
│   ├── restaurant-page-client.tsx  # Restaurant page (client)
│   ├── nutrition-sheet.tsx      # Bottom sheet with nutrition info
│   └── tier-badge.tsx           # ✅ / 🔶 / grey badge
├── lib/
│   ├── supabase.ts              # Supabase client
│   └── types.ts                 # TypeScript types
└── supabase/
    ├── schema.sql               # Database schema (run first)
    └── seed.sql                 # Seed data — 3 starter restaurants
```

---

## Phase Roadmap

| Phase | What's built | Status |
|---|---|---|
| 1 — Foundation | Home, restaurant page, nutrition detail sheet | ✅ Done |
| 2 — Meal Builder | Customisation groups + live nutrition calculator | Next |
| 3 — Crowdsourcing | Photo upload → Gemini Vision → admin review queue | Planned |
| 4 — Polish | PWA, sodium labels, analytics | Planned |
