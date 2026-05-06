"use client";

import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Camera, CheckCircle, ImagePlus } from "lucide-react";

interface ContributeRestaurantSheetProps {
  open: boolean;
  onClose: () => void;
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

export function ContributeRestaurantSheet({ open, onClose }: ContributeRestaurantSheetProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);
  const MAX_IMAGES = 3;

  function handleImages(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files).slice(0, MAX_IMAGES - images.length);
    const newImages = [...images, ...incoming].slice(0, MAX_IMAGES);
    setImages(newImages);
    setPreviews(newImages.map((f) => URL.createObjectURL(f)));
  }

  function removeImage(idx: number) {
    const newImages = images.filter((_, i) => i !== idx);
    setImages(newImages);
    setPreviews(newImages.map((f) => URL.createObjectURL(f)));
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    setStatus("loading");
    try {
      const fd = new FormData();
      fd.append("restaurant_name", name);
      fd.append("location_description", location);
      fd.append("cuisine_description", cuisine);
      images.forEach((img) => fd.append("images", img));
      fd.append("session_id", getSessionId());

      const res = await fetch("/api/submit/restaurant", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function handleClose() {
    setName(""); setLocation(""); setCuisine("");
    setImages([]); setPreviews([]); setStatus("idle");
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-0 pb-10 bg-white dark:bg-gray-900">
        <SheetHeader className="px-5 pb-4 pr-12">
          <SheetTitle className="text-left text-base font-semibold text-gray-900 dark:text-gray-100">
            Suggest a restaurant
          </SheetTitle>
          <p className="text-xs text-gray-400 text-left">We'll review it and add it to the app.</p>
        </SheetHeader>

        {status === "done" ? (
          <div className="px-5 py-12 flex flex-col items-center gap-3 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <p className="font-semibold text-gray-900 dark:text-gray-100">Thanks for the suggestion!</p>
            <p className="text-sm text-gray-400">We'll review it and add it soon.</p>
            <button onClick={handleClose} className="mt-4 text-sm text-emerald-600 font-medium">Close</button>
          </div>
        ) : (
          <div className="px-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                Restaurant name <span className="text-red-400">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Salad Lab"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Area / Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Tanjong Pagar, CBD"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Cuisine type</label>
              <input
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                placeholder="e.g. Salads, Bowls, Healthy"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Optional menu photos */}
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                Menu photos <span className="text-gray-400">(optional — up to {MAX_IMAGES}, helps us extract dish names)</span>
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
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-xs">Add</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 text-gray-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-sm">Add menu photo(s)</span>
                </button>
              )}
            </div>

            {status === "error" && (
              <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!name.trim() || status === "loading"}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
            >
              {status === "loading" ? (images.length > 0 ? "Reading menu…" : "Submitting…") : "Submit suggestion"}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
