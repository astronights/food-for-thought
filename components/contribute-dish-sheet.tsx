"use client";

import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Camera, ImagePlus, CheckCircle } from "lucide-react";

interface ContributeDishSheetProps {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  dishName: string;
  menuItemId: string | null;
  isNewDish: boolean;
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

export function ContributeDishSheet({
  open,
  onClose,
  restaurantId,
  restaurantName,
  dishName,
  menuItemId,
  isNewDish,
}: ContributeDishSheetProps) {
  const [name, setName] = useState(dishName);
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImage(file: File) {
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    if (!image || !description.trim()) return;
    setStatus("loading");
    try {
      const fd = new FormData();
      fd.append("image", image);
      fd.append("dish_name", name);
      fd.append("order_description", description);
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
          <div className="px-5 space-y-4">
            {/* Dish name */}
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
                  <span className="text-xs">Photo is never stored — AI reads it and discards it</span>
                </button>
              )}
            </div>

            {/* Order description */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                What did you order? <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Large acai bowl with granola, banana, honey. No added sugar."
                className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm min-h-[90px] resize-none"
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
