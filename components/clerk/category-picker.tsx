"use client";

import { CATEGORY_CONFIG, ITEM_CATEGORIES, type ItemCategory } from "@/types";
import { CATEGORY_ICONS } from "@/lib/ui-maps";
import { cn } from "@/lib/utils";

interface CategoryPickerProps {
  value: ItemCategory;
  onChange: (category: ItemCategory) => void;
}

/** Radio-style tiles. Keys 1-5 pick a tile from anywhere on the page (handled by the page). */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <div role="radiogroup" aria-label="Item category" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {ITEM_CATEGORIES.map((category, index) => {
        const config = CATEGORY_CONFIG[category];
        const Icon = CATEGORY_ICONS[config.icon];
        const selected = category === value;
        return (
          <button
            key={category}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(category)}
            className={cn(
              "relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-sm font-semibold transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border bg-card hover:border-primary/50 hover:bg-secondary",
            )}
          >
            <kbd
              className={cn(
                "absolute right-2 top-2 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold",
                selected ? "bg-white/20 text-primary-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              {index + 1}
            </kbd>
            <Icon className="size-7" aria-hidden="true" />
            {config.label}
            {config.hazardous && <span className="sr-only">(hazardous)</span>}
          </button>
        );
      })}
    </div>
  );
}
