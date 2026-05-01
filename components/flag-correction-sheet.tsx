"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Flag } from "lucide-react";

interface FlagCorrectionSheetProps {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  dishName: string;
  menuItemId: string | null;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem("fft_session");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("fft_session", id);
  }
  return id;
}

export function FlagCorrectionSheet({
  open,
  onClose,
  restaurantId,
  restaurantName,
  dishName,
  menuItemId,
}: FlagCorrectionSheetProps) {
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit() {
    if (!description.trim()) return;
    setStatus("loading");
    try {
      const fd = new FormData();
      fd.append("dish_name", dishName);
      fd.append("order_description", description);
      fd.append("restaurant_id", restaurantId);
      if (menuItemId) fd.append("menu_item_id", menuItemId);
      fd.append("session_id", getSessionId());
      fd.append("is_correction_flag", "true");

      const res = await fetch("/api/submit/dish", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function handleClose() {
    setDescription("");
    setStatus("idle");
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl px-0 pb-10 bg-white dark:bg-gray-900">
        <SheetHeader className="px-5 pb-4 pr-12">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <SheetTitle className="text-left text-base font-semibold text-gray-900 dark:text-gray-100">
              Flag an issue — {dishName}
            </SheetTitle>
          </div>
          <p className="text-xs text-gray-400 text-left mt-1">
            {restaurantName} · This dish has verified data. Flag it if something looks off and we'll review it.
          </p>
        </SheetHeader>

        {status === "done" ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <p className="font-semibold text-gray-900 dark:text-gray-100">Thanks for flagging!</p>
            <p className="text-sm text-gray-400">We'll review it and update the data if needed.</p>
            <button onClick={handleClose} className="mt-4 text-sm text-emerald-600 font-medium">Close</button>
          </div>
        ) : (
          <div className="px-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                What looks wrong? <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Calories seem too high — I weighed the bowl at around 350g and it felt lighter than 520 kcal. The sodium also seems off."
                className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm min-h-[110px] resize-none"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!description.trim() || status === "loading"}
              className="w-full py-3 rounded-xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-40 transition-opacity hover:bg-amber-600"
            >
              {status === "loading" ? "Submitting…" : "Submit flag"}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
