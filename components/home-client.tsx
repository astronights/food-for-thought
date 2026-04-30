"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { RestaurantCard } from "@/components/restaurant-card";
import { ContributeRestaurantSheet } from "@/components/contribute-restaurant-sheet";
import type { Restaurant } from "@/lib/types";
import { Search, PlusCircle } from "lucide-react";

const FILTERS = ["All", "Salads", "Bowls", "Wraps", "Sandwiches"] as const;
type Filter = (typeof FILTERS)[number];

interface HomeClientProps {
  restaurants: Restaurant[];
}

export function HomeClient({ restaurants }: HomeClientProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [showRestaurantSheet, setShowRestaurantSheet] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return restaurants.filter((r) => {
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.cuisine_tags.some((t) => t.toLowerCase().includes(q)) ||
        r.location_tags.some((t) => t.toLowerCase().includes(q));

      const matchesFilter =
        activeFilter === "All" ||
        r.cuisine_tags.some((t) =>
          t.toLowerCase().includes(activeFilter.toLowerCase())
        );

      return matchesSearch && matchesFilter;
    });
  }, [restaurants, query, activeFilter]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search restaurants or dishes…"
          className="pl-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 rounded-xl h-11 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === f
                ? "bg-emerald-600 text-white"
                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Restaurant list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No restaurants found.</p>
          {query && (
            <button
              className="mt-2 text-sm text-emerald-600 underline"
              onClick={() => setQuery("")}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </div>
      )}

      {/* Suggest a restaurant */}
      <button
        onClick={() => setShowRestaurantSheet(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 text-sm hover:border-emerald-300 hover:text-emerald-600 dark:hover:border-emerald-800 dark:hover:text-emerald-400 transition-colors mt-2"
      >
        <PlusCircle className="h-4 w-4" />
        Suggest a restaurant
      </button>

      <ContributeRestaurantSheet
        open={showRestaurantSheet}
        onClose={() => setShowRestaurantSheet(false)}
      />
    </div>
  );
}
