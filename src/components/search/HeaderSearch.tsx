"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/search/SearchBar";

export function HeaderSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <div className="hidden w-full max-w-md sm:block">
      <SearchBar
        value={value}
        onChange={setValue}
        onSubmit={(q) => {
          const trimmed = q.trim();
          if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
        }}
        placeholder="Search…"
      />
    </div>
  );
}
