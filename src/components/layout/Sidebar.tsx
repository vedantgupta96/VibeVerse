"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookHeart,
  Home,
  Library,
  Orbit,
  Radio,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/library", label: "Library", icon: Library },
  { href: "/journal", label: "Journal", icon: BookHeart },
  { href: "/dj", label: "AI DJ", icon: Radio },
  { href: "/taste", label: "Taste DNA", icon: Sparkles },
  { href: "/galaxy", label: "Galaxy", icon: Orbit },
  // "Radio" is already used by AI DJ, so Vibe Rooms gets "Users" (the room's
  // defining feature is who's listening together).
  { href: "/rooms", label: "Vibe Rooms", icon: Users },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass sticky top-0 m-3 hidden h-[calc(100dvh-1.5rem)] w-56 shrink-0 flex-col gap-1 rounded-lg p-4 md:flex">
      <Link
        href="/home"
        className="mb-6 px-2 font-display text-xl font-semibold tracking-tight"
      >
        Vibe<span className="text-gradient-aurora">Verse</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-space-3 text-star"
                  : "text-stardust hover:bg-space-2 hover:text-star",
              )}
            >
              <Icon
                className={cn("size-4", active && "text-aurora-cyan")}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
