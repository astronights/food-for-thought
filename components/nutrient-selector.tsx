"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export type NutrientKey = "calories" | "protein" | "carbs" | "fat";

const OPTIONS: { key: NutrientKey; label: string; short: string }[] = [
  { key: "calories", label: "Calories", short: "kcal" },
  { key: "protein", label: "Protein", short: "prot" },
  { key: "carbs", label: "Carbs", short: "carbs" },
  { key: "fat", label: "Fat", short: "fat" },
];

interface NutrientSelectorProps {
  value: NutrientKey;
  onChange: (v: NutrientKey) => void;
}

export function NutrientSelector({ value, onChange }: NutrientSelectorProps) {
  const current = OPTIONS.find((o) => o.key === value)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white text-xs font-semibold cursor-pointer">
        {current.short}
        <ChevronDown className="h-3 w-3 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.key}
            onClick={() => onChange(o.key)}
            className={o.key === value ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""}
          >
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
