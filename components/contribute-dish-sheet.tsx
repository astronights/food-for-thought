"use client";

import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
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
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [groups, setGroups] = useState<GroupWithOptions[]>([]);
  const [selections, setSelections] = useState<Selections>({});
  const [loadingGroups, setLoadingGroups] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch customisation groups when sheet opens for a customisable item
  useEffect(() => {
    if (!open || !hasCustomisation || !menuItemId) return;
    setLoadingGroups(true);
    supabase
      .from("customisation_groups")
      .select("*, customisation_options(*)")
      .eq("restaurant_id", restaurantId)
      .or(`menu_item_id.eq.${menuItemId},menu_item_id.is.null`)
      .order("display_order")
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

  function handleImage(file: File) {
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!image || !description.trim()) return;
    setStatus("loading");

    const selectionSummary = hasCustomisation
      ? buildSelectionSummary(groups, selections)
      : "";
    const fullDescription = selectionSummary
      ? `${selectionSummary}\n\n${description}`
      : description;

    try {
      const fd = new FormData();
      fd.append("image", image);
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
    setImage(null);
    setPreview(null);
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
                Photo of your meal <span className="text-red-400">*</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImage(e.target.files[0])}
              />
              {preview ? (
                <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
                >
                  <Camera className="h-8 w-8" />
                  <span className="text-sm font-medium">Take a photo or upload</span>
                  <span className="text-xs">Stored securely for admin review only — never shown publicly</span>
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
              disabled={!image || !description.trim() || status === "loading"}
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
