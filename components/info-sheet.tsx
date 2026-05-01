"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Info, CheckCircle, ChefHat, Camera, Flag, Shield } from "lucide-react";

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      <div className="ml-9 text-sm text-gray-500 dark:text-gray-400 space-y-1">
        {children}
      </div>
    </div>
  );
}

export function InfoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-8 w-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
        aria-label="How to use"
      >
        <Info className="h-4 w-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[88vh] overflow-y-auto rounded-t-2xl px-0 pb-10 bg-white dark:bg-gray-900"
        >
          <SheetHeader className="px-5 pb-2 pr-12">
            <SheetTitle className="text-left text-lg font-semibold text-gray-900 dark:text-gray-100">
              How Food for Thought works
            </SheetTitle>
            <p className="text-left text-sm text-gray-400 mt-1">
              Nutrition info for Singapore restaurants — no sign-up needed.
            </p>
          </SheetHeader>

          <div className="px-5 mt-5 space-y-6">

            <Section
              icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
              title="Browse restaurants"
            >
              <p>Tap any restaurant to see its menu with calorie counts at a glance. Use the search bar or filter chips at the top to narrow things down.</p>
              <p className="mt-1">Each restaurant has a badge:</p>
              <ul className="mt-1 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 text-xs font-bold">✓</span>
                  <span><strong className="text-gray-700 dark:text-gray-300">Verified</strong> — official nutrition data</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-500 text-xs font-bold tracking-tighter">···</span>
                  <span><strong className="text-gray-700 dark:text-gray-300">Community estimate</strong> — user-submitted, reviewed by us</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-500 text-xs font-bold">?</span>
                  <span><strong className="text-gray-700 dark:text-gray-300">No data yet</strong> — be the first to contribute</span>
                </li>
              </ul>
            </Section>

            <Section
              icon={<ChefHat className="h-4 w-4 text-emerald-600" />}
              title="Build your meal"
            >
              <p>Restaurants with a <strong className="text-gray-700 dark:text-gray-300">Build Your Meal</strong> card let you pick your base, protein, toppings and dressing. Nutrition totals update live as you make each selection.</p>
              <p className="mt-1">Tap the nutrient selector in the header (<strong className="text-gray-700 dark:text-gray-300">kcal ▾</strong>) to switch what's shown — calories, protein, carbs, or fat.</p>
            </Section>

            <Section
              icon={<Camera className="h-4 w-4 text-emerald-600" />}
              title="Submit nutrition data"
            >
              <p>On any restaurant page, scroll to the bottom and tap <strong className="text-gray-700 dark:text-gray-300">Contribute nutrition data</strong> to enter contribute mode.</p>
              <p className="mt-1">Tap a dish to submit a photo of your meal along with what you ordered. Our AI reads the photo, estimates the nutrition, and stores just the numbers — the photo is kept securely for admin review only.</p>
              <p className="mt-1">To suggest a brand new restaurant, tap <strong className="text-gray-700 dark:text-gray-300">Suggest a restaurant</strong> at the bottom of the home screen. You can upload a menu photo and we'll extract the dishes automatically.</p>
            </Section>

            <Section
              icon={<Flag className="h-4 w-4 text-emerald-600" />}
              title="Flag something wrong"
            >
              <p>On a restaurant with verified data, entering contribute mode shows a <strong className="text-gray-700 dark:text-gray-300">flag icon</strong> on each dish instead of a camera. Tap it to tell us what looks off — no photo needed, just a description.</p>
            </Section>

            <Section
              icon={<Shield className="h-4 w-4 text-emerald-600" />}
              title="How review works"
            >
              <p>Every submission — dish data, restaurant suggestions, and correction flags — goes to our admin queue before it's shown publicly. We review the AI-extracted numbers, make edits if needed, and approve or reject.</p>
              <p className="mt-1">Nothing goes live without a human check.</p>
            </Section>

          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
