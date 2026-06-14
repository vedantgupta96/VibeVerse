"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/search/SearchBar";

export function HomeSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function go(q: string) {
    const trimmed = q.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <SearchBar
      value={value}
      onChange={setValue}
      onSubmit={go}
      size="hero"
      placeholder="Search for a song or artist to begin…"
    />
  );
}
