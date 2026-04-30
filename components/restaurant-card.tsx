import Link from "next/link";
import { TierBadge } from "@/components/tier-badge";
import type { Restaurant } from "@/lib/types";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

const TIER_ACCENT: Record<number, string> = {
  1: "border-l-emerald-400",
  2: "border-l-amber-400",
  3: "border-l-gray-200 dark:border-l-gray-700",
};

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const accent = TIER_ACCENT[restaurant.tier] ?? TIER_ACCENT[3];

  return (
    <Link href={`/restaurants/${restaurant.slug}`}>
      <div
        className={`flex items-center gap-4 p-4 rounded-xl border-l-4 ${accent} bg-white dark:bg-gray-900 shadow-sm hover:shadow-md dark:shadow-gray-950 border border-gray-100 dark:border-gray-800 transition-all active:scale-[0.99]`}
      >
        {/* Logo */}
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950 dark:to-teal-900 flex items-center justify-center flex-shrink-0 text-lg font-bold text-emerald-600 dark:text-emerald-400">
          {restaurant.name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {restaurant.name}
            </span>
            <TierBadge tier={restaurant.tier} />
          </div>
          {restaurant.cuisine_tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {restaurant.cuisine_tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 capitalize"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <svg
          className="h-4 w-4 text-gray-300 dark:text-gray-600 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
