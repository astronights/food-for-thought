import Link from "next/link";
import { TierBadge } from "@/components/tier-badge";
import type { Restaurant } from "@/lib/types";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Link href={`/restaurants/${restaurant.slug}`}>
      <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all active:scale-[0.99]">
        {/* Logo placeholder */}
        <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg font-bold text-gray-400">
          {restaurant.name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 truncate">
              {restaurant.name}
            </span>
            <TierBadge tier={restaurant.tier} />
          </div>
          {restaurant.cuisine_tags.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5 truncate">
              {restaurant.cuisine_tags.join(" · ")}
            </p>
          )}
          {restaurant.location_tags.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {restaurant.location_tags.join(", ")}
            </p>
          )}
        </div>

        <svg
          className="h-4 w-4 text-gray-300 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </Link>
  );
}
