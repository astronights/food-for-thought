"use client";

import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compress-image";
import type { GroupWithOptions } from "@/lib/types";

interface ContributeDishSheetProps {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  dishName: string;
  menuItemId: string | null;
  isNewDish: boolean;
  hasCustomisation?: boolean;
}

type Selections = Record<string, string | string[]>;

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("fft_session");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("fft_session", id);
  }
  return id;
}

function buildSelectionSummary(groups: GroupWithOptions[], selections: Selections): string {
  return groups
    .map((group) => {
      const sel = selections[group.id];
      if (!sel || (Array.isArray(sel) && sel.length === 0)) return null;
      const ids = Array.isArray(sel) ? sel : [sel];
      const names = group.options
        .filter((o) => ids.includes(o.id))
        .map((o) => o.name)
        .join(", ");
      return names ? `${group.name}: ${names}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

function CustomisationGroups({
  groups,
  selections,
  onChange,
}: {
  groups: GroupWithOptions[];
  selections: Selections;
  onChange: (groupId: string, value: string | string[]) => void;
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isPickMany = group.ui_hint === "pick_many";
        const currentMany = (selections[group.id] as string[] | undefined) ?? [];

        return (
          <div key={group.id}>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{group.name}</p>
              {group.ui_hint === "pick_one_required" && (
                <span className="text-xs text-red-400">Required</span>
              )}
              {isPickMany && group.max_selections && (
                <span className="text-xs text-gray-400">up to {group.max_selections}</span>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
              {group.options.map((option) => {
                const isSelected = isPickMany
                  ? currentMany.includes(option.id)
                  : selections[group.id] === option.id;
                const isDisabled =
                  isPickMany &&
                  group.max_selections !== null &&
                  currentMany.length >= group.max_selections &&
                  !isSelected;

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      if (isPickMany) {
                        const next = currentMany.includes(option.id)
                          ? currentMany.filter((id) => id !== option.id)
                          : [...currentMany, option.id];
                        onChange(group.id, next);
                      } else {
                        onChange(group.id, option.id);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-950/30"
                        : isDisabled
                        ? "opacity-40"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 h-4 w-4 border-2 flex items-center justify-center transition-colors ${
                        isPickMany ? "rounded-sm" : "rounded-full"
                      } ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`flex-1 text-sm ${isSelected ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-gray-700 dark:text-gray-300"}`}>
                      {option.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ContributeDishSheet({
  open,
  onClose,
  restaurantId,
  restaurantName,
  dishName,
  menuItemId,
  isNewDish,
  hasCustomisation = false,
}: ContributeDishSheetProps) {
  const [name, setName] = useState(dishName);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [groups, setGroups] = useState<GroupWithOptions[]>([]);
  const [selections, setSelections] = useState<Selections>({});
  const [loadingGroups, setLoadingGroups] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const MAX_IMAGES = 3;

  // Fetch customisation groups when sheet opens for a customisable item
  useEffect(() => {
    if (!open || !hasCustomisation || !menuItemId) return;
    setLoadingGroups(true);
    Promise.all([
      supabase.from("customisation_groups").select("*, customisation_options(*)")
        .eq("menu_item_id", menuItemId)
        .order("display_order"),
      supabase.from("customisation_groups").select("*, customisation_options(*)")
        .eq("restaurant_id", restaurantId)
        .is("menu_item_id", null)
        .order("display_order"),
    ]).then(([{ data: itemGroups }, { data: restaurantGroups }]) => {
      const data = [
        ...(itemGroups ?? []),
        ...(restaurantGroups ?? []),
      ].sort((a, b) => a.display_order - b.display_order);
      return { data }; })
      .then(({ data }) => {
        if (data) {
          setGroups(
            data.map((g) => ({
              ...g,
              options: (g.customisation_options as GroupWithOptions["options"]).sort(
                (a, b) => a.display_order - b.display_order
              ),
            }))
          );
        }
        setLoadingGroups(false);
      });
  }, [open, hasCustomisation, menuItemId]);

  function handleSelectionChange(groupId: string, value: string | string[]) {
    setSelections((prev) => ({ ...prev, [groupId]: value }));
  }

  async function handleImages(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files).slice(0, MAX_IMAGES - images.length);
    const compressed = await Promise.all(incoming.map((f) => compressImage(f)));
    const newImages = [...images, ...compressed].slice(0, MAX_IMAGES);
    setImages(newImages);
    setPreviews(newImages.map((f) => URL.createObjectURL(f)));
  }

  function removeImage(idx: number) {
    const newImages = images.filter((_, i) => i !== idx);
    setImages(newImages);
    setPreviews(newImages.map((f) => URL.createObjectURL(f)));
  }

  async function handleSubmit() {
    if (images.length === 0 || !description.trim()) return;
    setStatus("loading");

    const selectionSummary = hasCustomisation
      ? buildSelectionSummary(groups, selections)
      : "";
    const fullDescription = selectionSummary
      ? `${selectionSummary}\n\n${description}`
      : description;

    try {
      const fd = new FormData();
      images.forEach((img) => fd.append("images", img));
      fd.append("dish_name", name);
      fd.append("order_description", fullDescription);
      fd.append("restaurant_id", restaurantId);
      if (menuItemId) fd.append("menu_item_id", menuItemId);
      fd.append("session_id", getSessionId());

      const res = await fetch("/api/submit/dish", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function handleClose() {
    setName(dishName);
    setDescription("");
    setImages([]);
    setPreviews([]);
    setStatus("idle");
    setSelections({});
    setGroups([]);
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-0 pb-10 bg-white dark:bg-gray-900">
        <SheetHeader className="px-5 pb-4 pr-12">
          <SheetTitle className="text-left text-base font-semibold text-gray-900 dark:text-gray-100">
            {isNewDish ? "Add a new dish" : `Add data for ${dishName}`}
          </SheetTitle>
          <p className="text-xs text-gray-400 text-left">{restaurantName}</p>
        </SheetHeader>

        {status === "done" ? (
          <div className="px-5 py-12 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <p className="font-semibold text-gray-900 dark:text-gray-100">Thanks for contributing!</p>
            <p className="text-sm text-gray-400">We'll review it before it goes live.</p>
            <button onClick={handleClose} className="mt-4 text-sm text-emerald-600 font-medium">Close</button>
          </div>
        ) : (
          <div className="px-5 space-y-5">
            {/* Dish name — only for new dishes */}
            {isNewDish && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Dish name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acai Bowl with Granola"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Customisation options */}
            {hasCustomisation && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                  What did you pick?
                </label>
                {loadingGroups ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 rounded-xl" />
                    <Skeleton className="h-10 rounded-xl" />
                  </div>
                ) : (
                  <CustomisationGroups
                    groups={groups}
                    selections={selections}
                    onChange={handleSelectionChange}
                  />
                )}
              </div>
            )}

            {/* Photo upload */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                Photo(s) of your meal <span className="text-red-400">*</span>
                <span className="text-gray-400 font-normal"> — up to {MAX_IMAGES}</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleImages(e.target.files)}
              />
              {previews.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    {previews.map((src, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden flex-1 aspect-square bg-gray-100 dark:bg-gray-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none"
                        >×</button>
                      </div>
                    ))}
                    {previews.length < MAX_IMAGES && (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className="flex-1 aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
                      >
                        <Camera className="h-5 w-5" />
                        <span className="text-xs">Add</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">Stored securely for admin review only — never shown publicly</p>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
                >
                  <Camera className="h-8 w-8" />
                  <span className="text-sm font-medium">Take a photo or upload</span>
                  <span className="text-xs">Add up to {MAX_IMAGES} photos · Stored securely for admin review only</span>
                </button>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                Anything else about your order? <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={hasCustomisation
                ? "e.g. Extra granola, no honey, large size. About 450g, paid $13.90."
                : "e.g. Large acai bowl with granola, banana, honey. No added sugar. About 400g, paid $12.50."}
                className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm min-h-[80px] resize-none"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={images.length === 0 || !description.trim() || status === "loading"}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
            >
              {status === "loading" ? "Analysing your photo…" : "Submit"}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
