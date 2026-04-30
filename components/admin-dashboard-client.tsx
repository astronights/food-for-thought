"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, LogOut } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DishSubmission {
  id: string;
  restaurants: { name: string; slug: string } | null;
  dish_name_raw: string;
  order_description: string;
  ai_calories: number;
  ai_protein_g: number;
  ai_carbs_g: number;
  ai_fat_g: number;
  ai_fibre_g: number;
  ai_sugar_g: number;
  ai_sat_fat_g: number;
  ai_sodium_mg: number;
  ai_confidence: number;
  ai_notes: string;
  admin_calories: number | null;
  admin_protein_g: number | null;
  admin_carbs_g: number | null;
  admin_fat_g: number | null;
  admin_sodium_mg: number | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

interface RestaurantSubmission {
  id: string;
  restaurant_name: string;
  location_description: string | null;
  cuisine_description: string | null;
  ai_extracted_dishes: { name: string; category: string | null; price_sgd: number | null }[] | null;
  ai_notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 75 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
    : pct >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{pct}%</span>;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
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
    await fetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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
      <div>
        <p className="text-xs font-medium text-gray-400 mb-1">What they ordered</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">{sub.order_description}</p>
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
              <input
                value={val}
                onChange={(e) => set(e.target.value)}
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-400 mb-1 block">Admin notes</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
          className="text-sm min-h-[60px] resize-none rounded-xl"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => submit("rejected")}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40"
        >
          <XCircle className="h-4 w-4" /> Reject
        </button>
        <button
          onClick={() => submit("approved")}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40"
        >
          <CheckCircle className="h-4 w-4" /> Approve
        </button>
      </div>
    </div>
  );
}

// ─── Restaurant submission detail ─────────────────────────────────────────────

function RestaurantDetail({ sub, onUpdate }: { sub: RestaurantSubmission; onUpdate: () => void }) {
  const [notes, setNotes] = useState(sub.admin_notes ?? "");
  const [name, setName] = useState(sub.restaurant_name);
  const [slug, setSlug] = useState(sub.restaurant_name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  const [saving, setSaving] = useState(false);

  async function reject() {
    setSaving(true);
    await fetch("/api/admin/restaurant-submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sub.id, status: "rejected", admin_notes: notes }),
    });
    setSaving(false);
    onUpdate();
  }

  async function approve() {
    setSaving(true);
    const tags = sub.cuisine_description?.split(",").map((s) => s.trim().toLowerCase()) ?? [];
    const locTags = sub.location_description?.split(",").map((s) => s.trim()) ?? [];
    await fetch("/api/admin/restaurant-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission_id: sub.id, name, slug, cuisine_tags: tags, location_tags: locTags, tier: 3 }),
    });
    setSaving(false);
    onUpdate();
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400 block mb-0.5">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-0.5">URL slug</label>
          <input value={slug} onChange={(e) => setSlug(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
      </div>

      {sub.location_description && (
        <p className="text-sm text-gray-600 dark:text-gray-400"><span className="text-xs text-gray-400 font-medium">Location: </span>{sub.location_description}</p>
      )}
      {sub.cuisine_description && (
        <p className="text-sm text-gray-600 dark:text-gray-400"><span className="text-xs text-gray-400 font-medium">Cuisine: </span>{sub.cuisine_description}</p>
      )}

      {sub.ai_extracted_dishes && sub.ai_extracted_dishes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-2">AI-extracted dishes ({sub.ai_extracted_dishes.length})</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {sub.ai_extracted_dishes.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{d.name}</span>
                {d.category && <span className="text-xs text-gray-400">{d.category}</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">These will be created as Tier 3 dish stubs on approval.</p>
        </div>
      )}

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
          <CheckCircle className="h-4 w-4" /> Create restaurant
        </button>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function AdminDashboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null | undefined>(undefined);
  const [dishSubs, setDishSubs] = useState<DishSubmission[]>([]);
  const [restSubs, setRestSubs] = useState<RestaurantSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");

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
      fetch("/api/admin/submissions").then((r) => r.json()),
      fetch("/api/admin/restaurant-submissions").then((r) => r.json()),
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

  const filteredDish = dishSubs.filter((s) => s.status === statusFilter);
  const filteredRest = restSubs.filter((s) => s.status === statusFilter);
  const pendingDish = dishSubs.filter((s) => s.status === "pending").length;
  const pendingRest = restSubs.filter((s) => s.status === "pending").length;

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
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(["pending", "approved", "rejected"] as const).map((s) => {
            const count = dishSubs.filter((d) => d.status === s).length + restSubs.filter((r) => r.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-xl p-3 text-center border transition-colors ${statusFilter === s ? "bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800 shadow-sm" : "bg-gray-100 dark:bg-gray-900/50 border-transparent"}`}
              >
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{count}</div>
                <div className="text-xs text-gray-400 capitalize">{s}</div>
              </button>
            );
          })}
        </div>

        <Tabs defaultValue="dishes">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="dishes" className="flex-1">
              Dish submissions {pendingDish > 0 && <span className="ml-1.5 bg-emerald-600 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingDish}</span>}
            </TabsTrigger>
            <TabsTrigger value="restaurants" className="flex-1">
              Restaurants {pendingRest > 0 && <span className="ml-1.5 bg-emerald-600 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingRest}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dishes">
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : filteredDish.length === 0 ? (
              <p className="text-center py-12 text-sm text-gray-400">No {statusFilter} dish submissions.</p>
            ) : (
              <div className="space-y-3">
                {filteredDish.map((sub) => (
                  <div key={sub.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
                    <button className="w-full flex items-start justify-between gap-3" onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">{sub.dish_name_raw || "Unnamed dish"}</span>
                          <ConfidenceBadge score={sub.ai_confidence} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{sub.restaurants?.name ?? "Unknown restaurant"} · {timeAgo(sub.created_at)}</p>
                      </div>
                      {expandedId === sub.id ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />}
                    </button>
                    {expandedId === sub.id && <DishDetail sub={sub} onUpdate={() => { setExpandedId(null); loadData(); }} />}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="restaurants">
            {loading ? (
              <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : filteredRest.length === 0 ? (
              <p className="text-center py-12 text-sm text-gray-400">No {statusFilter} restaurant suggestions.</p>
            ) : (
              <div className="space-y-3">
                {filteredRest.map((sub) => (
                  <div key={sub.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
                    <button className="w-full flex items-start justify-between gap-3" onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{sub.restaurant_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {sub.location_description ?? "No location"} · {timeAgo(sub.created_at)}
                          {sub.ai_extracted_dishes && ` · ${sub.ai_extracted_dishes.length} dishes extracted`}
                        </p>
                      </div>
                      {expandedId === sub.id ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />}
                    </button>
                    {expandedId === sub.id && <RestaurantDetail sub={sub} onUpdate={() => { setExpandedId(null); loadData(); }} />}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
