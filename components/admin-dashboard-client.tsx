"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, LogOut, Plus, Trash2, ImageIcon, Flag } from "lucide-react";

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

interface RuleSuggestion {
  group_name: string;
  field: string;
  current_value: number;
  suggested_value: number;
  reason: string;
}

interface DishSubmission {
  id: string;
  is_correction_flag: boolean;
  ai_group_suggestions: RuleSuggestion[] | null;
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
  submitter_notes: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ai_extracted_dishes: any | null;
  ai_notes: string | null;
  status: string; admin_notes: string | null;
  image_path: string | null;
  image_paths: string[] | null;
  created_at: string;
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

// ─── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Full size"
        className="max-w-full max-h-full object-contain rounded-lg cursor-default"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Submission image ─────────────────────────────────────────────────────────

function SubmissionImage({ imagePath }: { imagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    adminFetch(`/api/admin/image?path=${encodeURIComponent(imagePath)}`)
      .then((r) => r.json())
      .then((d) => { setUrl(d.url ?? null); setLoading(false); });
  }, [imagePath]);

  if (loading) return <Skeleton className="w-full aspect-video rounded-xl" />;
  if (!url) return null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Submission photo"
        className="w-full rounded-xl object-cover max-h-56 cursor-zoom-in"
        onClick={() => setLightbox(true)}
        title="Click to enlarge"
      />
      {lightbox && <Lightbox url={url} onClose={() => setLightbox(false)} />}
    </>
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
      {sub.is_correction_flag && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
          <Flag className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Correction flag on verified data</p>
            <p className="text-xs text-amber-600/70 dark:text-amber-500 mt-0.5">Gemini estimated suggested values from the user&apos;s text. Edit as needed, then approve to log the correction.</p>
          </div>
        </div>
      )}

      {sub.image_path && !sub.is_correction_flag && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" /> Submitted photo
          </p>
          <SubmissionImage imagePath={sub.image_path} />
        </div>
      )}

      <div>
        <p className="text-xs font-medium text-gray-400 mb-1">{sub.is_correction_flag ? "What they flagged" : "What they ordered"}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{sub.order_description}</p>
      </div>

      {sub.ai_notes && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">AI notes</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">{sub.ai_notes}</p>
        </div>
      )}

      {/* Rule suggestions for correction flags */}
      {sub.is_correction_flag && sub.ai_group_suggestions && sub.ai_group_suggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-400">Suggested rule changes</p>
          {sub.ai_group_suggestions.map((s, i) => (
            <div key={i} className="rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-xs space-y-0.5">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                &quot;{s.group_name}&quot; — {s.field}: {s.current_value === -1 ? "unlimited" : s.current_value} → {s.suggested_value === -1 ? "unlimited" : s.suggested_value}
              </p>
              <p className="text-amber-600/80 dark:text-amber-500">{s.reason}</p>
              <p className="text-gray-400 font-mono mt-1 select-all">
                update customisation_groups set {s.field} = {s.suggested_value === -1 ? "null" : s.suggested_value} where name = &apos;{s.group_name}&apos;;
              </p>
            </div>
          ))}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-400">
            {sub.is_correction_flag ? "Gemini estimate from flag text — editable" : "Nutrition values (editable)"}
          </p>
          {sub.is_correction_flag && <ConfidenceBadge score={sub.ai_confidence} />}
        </div>
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
interface EditableOption { name: string; price_delta_sgd: number }
interface EditableGroup {
  name: string;
  ui_hint: "pick_one_required" | "pick_one" | "pick_many";
  max_selections: number | null;
  options: EditableOption[];
}

const inputCls = "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500";

function RestaurantDetail({ sub, onUpdate }: { sub: RestaurantSubmission; onUpdate: () => void }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extract = sub.ai_extracted_dishes as any;
  const isBYO = extract && !Array.isArray(extract) && extract?.menu_type === "build_your_own";

  const initialDishes: EditableDish[] = (() => {
    if (!extract) return [];
    if (Array.isArray(extract)) return extract.map((d: { name: string; category?: string }) => ({ name: d.name, category: d.category ?? "Menu" }));
    if (extract.dishes) return (extract.dishes as { name: string; category?: string }[]).map((d) => ({ name: d.name, category: d.category ?? "Menu" }));
    return [];
  })();

  const initialGroups: EditableGroup[] = (() => {
    if (!isBYO) return [];
    return (extract.customisation_groups ?? []).map((g: { name: string; ui_hint: string; max_selections: number; options: { name: string; price_delta_sgd?: number }[] }) => ({
      name: g.name,
      ui_hint: g.ui_hint as EditableGroup["ui_hint"],
      // pick_many is always unlimited regardless of what Gemini returned
      max_selections: g.ui_hint === "pick_many" ? null : (g.max_selections ?? 1),
      options: (g.options ?? []).map((o) => ({ name: o.name, price_delta_sgd: o.price_delta_sgd ?? 0 })),
    }));
  })();

  const [notes, setNotes] = useState(sub.admin_notes ?? "");
  const [name, setName] = useState(sub.restaurant_name);
  const [slug, setSlug] = useState(sub.restaurant_name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  const [dishes, setDishes] = useState<EditableDish[]>(initialDishes);
  const [groups, setGroups] = useState<EditableGroup[]>(initialGroups);
  const [saving, setSaving] = useState(false);

  // ── Dish helpers ──
  function updateDish(i: number, field: keyof EditableDish, val: string) {
    setDishes((p) => p.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  }
  function removeDish(i: number) { setDishes((p) => p.filter((_, idx) => idx !== i)); }
  function addDish() { setDishes((p) => [...p, { name: "", category: "Menu" }]); }

  // ── Group helpers ──
  function updateGroup(gi: number, field: keyof Omit<EditableGroup, "options">, val: string | number | null) {
    setGroups((p) => p.map((g, i) => {
      if (i !== gi) return g;
      const updated = { ...g, [field]: val };
      // Switching to pick_many → unlimited (null); switching to pick_one → exactly 1
      if (field === "ui_hint" && val === "pick_many") updated.max_selections = null;
      if (field === "ui_hint" && val !== "pick_many") updated.max_selections = 1;
      return updated;
    }));
  }
  function removeGroup(gi: number) { setGroups((p) => p.filter((_, i) => i !== gi)); }
  function addGroup() {
    setGroups((p) => [...p, { name: "New group", ui_hint: "pick_many", max_selections: null, options: [] }]);
  }

  // ── Option helpers ──
  function updateOption(gi: number, oi: number, field: keyof EditableOption, val: string | number) {
    setGroups((p) => p.map((g, i) => i !== gi ? g : {
      ...g, options: g.options.map((o, j) => j === oi ? { ...o, [field]: val } : o),
    }));
  }
  function removeOption(gi: number, oi: number) {
    setGroups((p) => p.map((g, i) => i !== gi ? g : { ...g, options: g.options.filter((_, j) => j !== oi) }));
  }
  function addOption(gi: number) {
    setGroups((p) => p.map((g, i) => i !== gi ? g : { ...g, options: [...g.options, { name: "", price_delta_sgd: 0 }] }));
  }

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
        edited_groups: isBYO ? groups : null,
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
      {sub.submitter_notes && (
        <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
          <span className="text-xs font-medium">Submitter note: </span>{sub.submitter_notes}
        </p>
      )}

      {/* ── BYO: editable customisation groups ── */}
      {isBYO && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">Build Your Own</span>
              {extract.base_price_sgd > 0 && <span className="text-xs text-gray-400">${extract.base_price_sgd}</span>}
            </div>
            <button onClick={addGroup} className="text-xs text-emerald-600 flex items-center gap-1 hover:text-emerald-700">
              <Plus className="h-3 w-3" /> Add group
            </button>
          </div>
          {extract.meal_structure && <p className="text-xs text-gray-400 italic">"{extract.meal_structure}"</p>}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {groups.map((g, gi) => (
              <div key={gi} className="rounded-xl border border-gray-100 dark:border-gray-800 p-3 space-y-2 bg-gray-50 dark:bg-gray-900/50">
                {/* Group header row */}
                <div className="flex items-center gap-1.5">
                  <input value={g.name} onChange={(e) => updateGroup(gi, "name", e.target.value)}
                    className={`${inputCls} flex-1`} placeholder="Group name" />
                  {/* One / Many toggle */}
                  <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs flex-shrink-0">
                    <button
                      onClick={() => updateGroup(gi, "ui_hint", "pick_one_required")}
                      className={`px-2 py-1 transition-colors ${g.ui_hint !== "pick_many" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                    >One</button>
                    <button
                      onClick={() => updateGroup(gi, "ui_hint", "pick_many")}
                      className={`px-2 py-1 transition-colors ${g.ui_hint === "pick_many" ? "bg-emerald-500 text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                    >Many</button>
                  </div>
                  {/* Required toggle — only visible for pick_one */}
                  {g.ui_hint !== "pick_many" && (
                    <label className="flex items-center gap-0.5 text-xs text-gray-500 cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={g.ui_hint === "pick_one_required"}
                        onChange={(e) => updateGroup(gi, "ui_hint", e.target.checked ? "pick_one_required" : "pick_one")}
                        className="rounded"
                      />
                      req
                    </label>
                  )}
                  <button onClick={() => removeGroup(gi)} className="text-gray-300 dark:text-gray-600 hover:text-red-400 flex-shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Options */}
                <div className="space-y-1 ml-2">
                  {g.options.map((o, oi) => (
                    <div key={oi} className="flex gap-1.5 items-center">
                      <input value={o.name} onChange={(e) => updateOption(gi, oi, "name", e.target.value)}
                        placeholder="Option name" className={`${inputCls} flex-1`} />
                      <button onClick={() => removeOption(gi, oi)} className="text-gray-300 dark:text-gray-600 hover:text-red-400 flex-shrink-0">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addOption(gi)}
                    className="text-xs text-gray-400 hover:text-emerald-600 flex items-center gap-1 mt-1">
                    <Plus className="h-3 w-3" /> Add option
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Regular menu: editable dish list ── */}
      {!isBYO && dishes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-400">Dishes ({dishes.length})</p>
            <button onClick={addDish} className="text-xs text-emerald-600 flex items-center gap-1 hover:text-emerald-700">
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {dishes.map((d, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <input value={d.name} onChange={(e) => updateDish(i, "name", e.target.value)}
                  placeholder="Dish name" className={`${inputCls} flex-1`} />
                <input value={d.category} onChange={(e) => updateDish(i, "category", e.target.value)}
                  placeholder="Category" className={`${inputCls} w-24`} />
                <button onClick={() => removeDish(i)} className="text-gray-300 dark:text-gray-600 hover:text-red-400 flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
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
                        {sub.is_correction_flag
                          ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 flex items-center gap-1"><Flag className="h-3 w-3" />Flag</span>
                          : <ConfidenceBadge score={sub.ai_confidence} />}
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
