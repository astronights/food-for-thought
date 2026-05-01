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
      : "Community estimate — not yet verified";
    return (
      <span
        title={label}
        className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-500 dark:text-blue-400 text-xs flex-shrink-0 tracking-tighter leading-none"
      >
        ···
      </span>
    );
  }

  return (
    <span
      title="No nutrition data yet — be the first to contribute"
      className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-500 dark:text-yellow-400 text-xs flex-shrink-0 font-semibold"
    >
      ?
    </span>
  );
}
