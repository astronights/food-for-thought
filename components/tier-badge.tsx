"use client";

import type { RestaurantTier } from "@/lib/types";

interface TierBadgeProps {
  tier: RestaurantTier;
  submissionCount?: number;
}

export function TierBadge({ tier, submissionCount }: TierBadgeProps) {
  if (tier === 1) {
    return (
      <span
        title="Verified nutrition data"
        className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs flex-shrink-0"
      >
        ✓
      </span>
    );
  }
  if (tier === 2) {
    const label = submissionCount
      ? `Community estimate · ${submissionCount} submission${submissionCount === 1 ? "" : "s"}`
      : "Community estimate";
    return (
      <span
        title={label}
        className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-xs flex-shrink-0"
      >
        ~
      </span>
    );
  }
  return (
    <span
      title="No nutrition data yet"
      className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs flex-shrink-0"
    >
      ?
    </span>
  );
}
