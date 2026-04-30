"use client";

import { Badge } from "@/components/ui/badge";
import type { RestaurantTier } from "@/lib/types";

interface TierBadgeProps {
  tier: RestaurantTier;
  submissionCount?: number;
}

export function TierBadge({ tier, submissionCount }: TierBadgeProps) {
  if (tier === 1) {
    return (
      <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 text-xs font-medium">
        ✅ Verified
      </Badge>
    );
  }
  if (tier === 2) {
    const label = submissionCount
      ? `🔶 Community · ${submissionCount} submission${submissionCount === 1 ? "" : "s"}`
      : "🔶 Community estimate";
    return (
      <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 text-xs font-medium">
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50 text-xs font-medium">
      No data yet
    </Badge>
  );
}
