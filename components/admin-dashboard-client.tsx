"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, LogOut, Plus, Trash2, ImageIcon } from "lucide-react";

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function adminFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DishSubmission {
  id: string;
  restaurants: { name: string; slug: string } | null;
  dish_name_raw: string;
  order_description: string;
  ai_calories: number; ai_protein_g: number; ai_carbs_g: number;
  ai_fat_g: number; ai_fibre_g: number; ai_sugar_g: number;
  ai_sat_fat_g: number; ai_sodium_mg: number;
  ai_confidence: number; ai_notes: string;
  admin_calories: number | null; admin_protein_g: number | null;
  admin_carbs_g: number | null; admin_fat_g: number | null;
  admin_sodium_mg: number | null;
  status: string; admin_notes: string | null;
  image_path: string | null; created_at: string;
}

interface RestaurantSubmission {
  id: string;
  restaurant_name: string;
  location_description: string | null;
  cuisine_description: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ai_extracted_dishes: any | null;
  ai_notes: string | null;
  status: string; admin_notes: string | null;
  image_path: string | null; created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 75
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
    : pct >= 50
    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{pct}%</span>;
}

function timeAgo(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Submission image ─────────────────────────────────────────────────────────

function SubmissionImage({ imagePath }: { imagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch(`/api/admin/image?path=${encodeURIComponent(imagePath)}`)
      .then((r) => r.json())
      .then((d) => { setUrl(d.url ?? null); setLoading(false); });
  }, [imagePath]);

  if (loading) return <Skeleton className="w-full aspect-video rounded-xl" />;
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Submission photo" className="w-full rounded-xl object-cover max-h-56" />
  );
}

// ─── Dish submission detail ───────────────────────────────────────────────────

function DishDetail({ sub, onUpdate }: { sub: DishSubmission; onUpdate: () => void }) {
  const [cal, setCal] = useState(String(sub.admin_calories ?? sub.ai_calories));
  const [prot, setProt] = useState(String(sub.admin_protein_g ?? sub.ai_protein_g));
  const [carbs, setCarbs] = useState(String(sub.admin_carbs_g ?? sub.ai_carbs_g));
  const [fat, setFat] = useState(String(sub.admin_fat_g ?? sub.ai_fat_g));
  const [sodium, setSodium] = useState(String(sub.admin_sodium_mg ?? sub.ai_sodium_mg));
  const [notes, setNotes] = useState(sub.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(status: "approved" | "rejected") {
    setSaving(true);
    await adminFetch("/api/admin/submissions", {
      method: "PATCH",
      body: JSON.stringify({
        id: sub.id, status, admin_notes: notes,
        admin_calories: Number(cal), admin_protein_g: Number(prot),
        admin_carbs_g: Number(carbs), admin_fat_g: Number(fat),
        admin_sodium_mg: Number(sodium),
      }),
    });
    setSaving(false);
    onUpdate();
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-4">
      {sub.image_path && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" /> Submitted photo
          </p>
          <SubmissionImage imagePath={sub.image_path} />
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-gray-400 mb-1">What they ordered</p>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{sub.order_description}</p>
      </div>

      {sub.ai_notes && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">AI notes</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">{sub.ai_notes}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-gray-400 mb-2">Nutrition values (editable)</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Calories", val: cal, set: setCal },
            { label: "Protein g", val: prot, set: setProt },
            { label: "Carbs g", val: carbs, set: setCarbs },
            { label: "Fat g", val: fat, set: setFat },
            { label: "Sodium mg", val: sodium, set: setSodium },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-xs text-gray-400 block mb-0.5">{label}</label>
              <input value={val} onChange={(e) => set(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-400 mb-1 block">Admin notes</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..." className="text-sm min-h-[60px] resize-none rounded-xl" />
      </div>

      <div className="flex gap-2">
        <button onClick={() => submit("rejected")} disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40">
          <XCircle className="h-4 w-4" /> Reject
        </button>
        <button onClick={() => submit("approved")} disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40">
          <CheckCircle className="h-4 w-4" /> Approve
        </button>
      </div>
    </div>
  );
}

// ─── Restaurant submission detail ─────────────────────────────────────────────

interface EditableDish { name: string; category: string }

function RestaurantDetail({ sub, onUpdate }: { sub: RestaurantSubmission; onUpdate: () => void }) {
  const extract = sub.ai_extracted_dishes;
  const isBYO = extract && !Array.isArray(extract) && extract?.menu_type === "build_your_own";

  const initialDishes: EditableDish[] = (() => {
    if (!extract) return [];
    if (Array.isArray(extract)) return extract.map((d: { name: string; category?: string }) => ({ name: d.name, category: d.category ?? "Menu" }));
    if (extract.dishes) return (extract.dishes as { name: string; category?: string }[]).map((d) => ({ name: d.name, category: d.category ?? "Menu" }));
    return [];
  })();

  const [notes, setNotes] = useState(sub.admin_notes ?? "");
  const [name, setName] = useState(sub.restaurant_name);
  const [slug, setSlug] = useState(sub.restaurant_name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  const [dishes, setDishes] = useState<EditableDish[]>(initialDishes);
  const [saving, setSaving] = useState(false);

  function updateDish(i: number, field: keyof EditableDish, val: string) {
    setDishes((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  }
  function removeDish(i: number) { setDishes((prev) => prev.filter((_, idx) => idx !== i)); }
  function addDish() { setDishes((prev) => [...prev, { name: "", category: "Menu" }]); }

  async function reject() {
    setSaving(true);
    await adminFetch("/api/admin/restaurant-submissions", {
      method: "PATCH",
      body: JSON.stringify({ id: sub.id, status: "rejected", admin_notes: notes }),
    });
    setSaving(false);
    onUpdate();
  }

  async function approve() {
    setSaving(true);
    const tags = sub.cuisine_description?.split(",").map((s) => s.trim().toLowerCase()) ?? [];
    const locTags = sub.location_description?.split(",").map((s) => s.trim()) ?? [];
    await adminFetch("/api/admin/restaurant-submissions", {
      method: "POST",
      body: JSON.stringify({
        submission_id: sub.id, name, slug,
        cuisine_tags: tags, location_tags: locTags, tier: 3,
        edited_dishes: isBYO ? null : dishes,
      }),
    });
    setSaving(false);
    onUpdate();
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-4">
      {sub.image_path && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" /> Menu photo
          </p>
          <SubmissionImage imagePath={sub.image_path} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400 block mb-0.5">Restaurant name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-0.5">URL slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
      </div>

      {sub.location_description && (
        <p className="text-sm text-gray-500 dark:text-gray-400"><span className="text-xs text-gray-400 font-medium">Location: </span>{sub.location_description}</p>
      )}
      {sub.cuisine_description && (
        <p className="text-sm text-gray-500 dark:text-gray-400"><span className="text-xs text-gray-400 font-medium">Cuisine: </span>{sub.cuisine_description}</p>
      )}

      {isBYO ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">Build Your Own menu</span>
            {extract.base_price_sgd > 0 && <span className="text-xs text-gray-400">Base: ${extract.base_price_sgd}</span>}
          </div>
          {extract.meal_structure && <p className="text-xs text-gray-500 italic">"{extract.meal_structure}"</p>}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {(extract.customisation_groups ?? []).map((g: { name: string; ui_hint: string; max_selections: number; options: { name: string }[] }, i: number) => (
              <div key={i} className="text-xs">
                <span className="font-medium text-gray-600 dark:text-gray-400">{g.name}</span>
                <span className="text-gray-400 ml-1">
                  ({g.ui_hint === "pick_one_required" ? "pick 1 required" : `pick up to ${g.max_selections || "∞"}`}) — {g.options?.length ?? 0} options
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">Approval creates "Build Your Own" item with all groups + options.</p>
        </div>
      ) : dishes.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-400">Dishes ({dishes.length}) — editable before approval</p>
            <button onClick={addDish} className="text-xs text-emerald-600 flex items-center gap-1 hover:text-emerald-700">
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {dishes.map((d, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <input value={d.name} onChange={(e) => updateDish(i, "name", e.target.value)}
                  placeholder="Dish name"
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                <input value={d.category} onChange={(e) => updateDish(i, "category", e.target.value)}
                  placeholder="Category"
                  className="w-24 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                <button onClick={() => removeDish(i)} className="text-gray-300 dark:text-gray-600 hover:text-red-400 flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <label className="text-xs font-medium text-gray-400 mb-1 block">Admin notes</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..." className="text-sm min-h-[60px] resize-none rounded-xl" />
      </div>

      <div className="flex gap-2">
        <button onClick={reject} disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 disabled:opacity-40">
          <XCircle className="h-4 w-4" /> Reject
        </button>
        <button onClick={approve} disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40">
          <CheckCircle className="h-4 w-4" /> {isBYO ? "Create restaurant" : "Approve"}
        </button>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

type StatusFilter = "pending" | "approved" | "rejected";
type TabFilter = "dishes" | "restaurants";

export function AdminDashboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null | undefined>(undefined);
  const [dishSubs, setDishSubs] = useState<DishSubmission[]>([]);
  const [restSubs, setRestSubs] = useState<RestaurantSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [activeTab, setActiveTab] = useState<TabFilter>("dishes");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/admin/login"); return; }
      setUser(data.user as { email: string });
      loadData();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true);
    const [d, r] = await Promise.all([
      adminFetch("/api/admin/submissions").then((r) => r.json()),
      adminFetch("/api/admin/restaurant-submissions").then((r) => r.json()),
    ]);
    setDishSubs(Array.isArray(d) ? d : []);
    setRestSubs(Array.isArray(r) ? r : []);
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (user === undefined) return null;

  const STATUSES: StatusFilter[] = ["pending", "approved", "rejected"];

  const filteredDish = dishSubs.filter((s) => s.status === statusFilter);
  const filteredRest = restSubs.filter((s) => s.status === statusFilter);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-white">Admin</h1>
            <p className="text-xs text-emerald-100">{user?.email}</p>
          </div>
          <button onClick={signOut} className="text-white/70 hover:text-white">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Stats — dish count | restaurant count per status */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {STATUSES.map((s) => {
            const dc = dishSubs.filter((d) => d.status === s).length;
            const rc = restSubs.filter((r) => r.status === s).length;
            return (
              <button key={s} onClick={() => { setStatusFilter(s); setExpandedId(null); }}
                className={`rounded-xl p-3 text-center border transition-colors ${statusFilter === s ? "bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800 shadow-sm" : "bg-gray-100 dark:bg-gray-900/50 border-transparent"}`}>
                <div className="flex items-center justify-center gap-1.5 text-lg font-bold text-gray-900 dark:text-gray-100">
                  <span>{dc}</span>
                  <span className="text-gray-200 dark:text-gray-700 font-light text-base">|</span>
                  <span>{rc}</span>
                </div>
                <div className="text-xs text-gray-400 capitalize mt-0.5">{s}</div>
                <div className="text-xs text-gray-300 dark:text-gray-600">dishes · rest.</div>
              </button>
            );
          })}
        </div>

        {/* Tabs — manual state, not shadcn Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900/50 rounded-xl p-1 mb-4">
          {(["dishes", "restaurants"] as const).map((tab) => {
            const count = tab === "dishes"
              ? dishSubs.filter((s) => s.status === "pending").length
              : restSubs.filter((s) => s.status === "pending").length;
            return (
              <button key={tab} onClick={() => { setActiveTab(tab); setExpandedId(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                {tab === "dishes" ? "Dish submissions" : "Restaurant suggestions"}
                {count > 0 && statusFilter === "pending" && (
                  <span className="bg-emerald-600 text-white text-xs px-1.5 py-0.5 rounded-full">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : activeTab === "dishes" ? (
          filteredDish.length === 0 ? (
            <p className="text-center py-12 text-sm text-gray-400">No {statusFilter} dish submissions.</p>
          ) : (
            <div className="space-y-3">
              {filteredDish.map((sub) => (
                <div key={sub.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
                  <button className="w-full flex items-start justify-between gap-3"
                    onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{sub.dish_name_raw || "Unnamed dish"}</span>
                        <ConfidenceBadge score={sub.ai_confidence} />
                        {sub.image_path && <ImageIcon className="h-3.5 w-3.5 text-gray-400" />}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{sub.restaurants?.name ?? "Unknown"} · {timeAgo(sub.created_at)}</p>
                    </div>
                    {expandedId === sub.id ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />}
                  </button>
                  {expandedId === sub.id && (
                    <DishDetail sub={sub} onUpdate={() => { setExpandedId(null); loadData(); }} />
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          filteredRest.length === 0 ? (
            <p className="text-center py-12 text-sm text-gray-400">No {statusFilter} restaurant suggestions.</p>
          ) : (
            <div className="space-y-3">
              {filteredRest.map((sub) => (
                <div key={sub.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
                  <button className="w-full flex items-start justify-between gap-3"
                    onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{sub.restaurant_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {sub.location_description ?? "No location"} · {timeAgo(sub.created_at)}
                        {sub.image_path && " · 📷"}
                        {sub.ai_extracted_dishes && !Array.isArray(sub.ai_extracted_dishes) && sub.ai_extracted_dishes.menu_type === "build_your_own" && " · BYO menu"}
                      </p>
                    </div>
                    {expandedId === sub.id ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />}
                  </button>
                  {expandedId === sub.id && (
                    <RestaurantDetail sub={sub} onUpdate={() => { setExpandedId(null); loadData(); }} />
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
}
