"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { isNavItemActive, NAV } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

const PRIMARY_HREFS = new Set(["/home", "/search", "/library", "/rooms"]);
const PRIMARY_ITEMS = NAV.filter((item) => PRIMARY_HREFS.has(item.href));
const MORE_ITEMS = NAV.filter((item) => !PRIMARY_HREFS.has(item.href));

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpenAt, setMoreOpenAt] = useState<string | null>(null);
  const moreOpen = moreOpenAt === pathname;
  const moreButton = useRef<HTMLButtonElement>(null);
  const moreActive = MORE_ITEMS.some((item) =>
    isNavItemActive(pathname, item.href),
  );

  useEffect(() => {
    if (!moreOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMoreOpenAt(null);
      moreButton.current?.focus();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  return (
    <nav
      aria-label="Primary navigation"
      className="glass fixed inset-x-2 bottom-2 z-40 rounded-lg md:hidden"
    >
      <div className="grid grid-cols-5 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1">
        {PRIMARY_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[.68rem]",
                active
                  ? "bg-space-3 text-star"
                  : "text-stardust hover:text-star",
              )}
            >
              <Icon
                className={cn("size-5", active && "text-aurora-cyan")}
                aria-hidden
              />
              {label === "Vibe Rooms" ? "Rooms" : label}
            </Link>
          );
        })}
        <button
          ref={moreButton}
          type="button"
          aria-expanded={moreOpen}
          aria-controls="mobile-more-navigation"
          aria-label={moreActive ? "More, current section selected" : "More"}
          onClick={() => setMoreOpenAt(moreOpen ? null : pathname)}
          className={cn(
            "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[.68rem]",
            moreActive || moreOpen
              ? "bg-space-3 text-star"
              : "text-stardust hover:text-star",
          )}
        >
          <Ellipsis
            className={cn("size-5", moreActive && "text-aurora-cyan")}
            aria-hidden
          />
          More
        </button>
      </div>

      <div
        id="mobile-more-navigation"
        hidden={!moreOpen}
        className="absolute inset-x-0 bottom-full mb-2 grid grid-cols-2 gap-2 rounded-lg border border-border bg-space-1 p-3 shadow-ambient"
      >
        {MORE_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={() => setMoreOpenAt(null)}
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-md px-3 text-sm",
                active
                  ? "bg-space-3 text-star"
                  : "text-stardust hover:bg-space-2 hover:text-star",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
