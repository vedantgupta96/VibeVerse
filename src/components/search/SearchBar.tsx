"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Search songs and artists…",
  autoFocus = false,
  size = "compact",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  size?: "compact" | "hero";
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
      role="search"
      className="relative w-full"
    >
      <Search
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint",
          size === "hero" ? "size-5" : "size-4",
        )}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        type="search"
        aria-label="Search songs and artists"
        className={cn(
          "w-full rounded-full border border-border bg-space-1/70 text-star outline-none transition-colors placeholder:text-faint focus:border-aurora-violet/60",
          size === "hero"
            ? "py-4 pr-5 pl-12 text-base"
            : "py-2.5 pr-4 pl-10 text-sm",
        )}
      />
    </form>
  );
}
