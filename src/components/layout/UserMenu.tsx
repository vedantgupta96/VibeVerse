"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function UserMenu({
  name,
  email,
}: {
  name: string;
  email: string;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const initial = (name || email).charAt(0).toUpperCase();

  async function onSignOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2.5">
        <span className="gradient-aurora flex size-8 items-center justify-center rounded-full text-sm font-semibold text-void">
          {initial}
        </span>
        <div className="hidden flex-col leading-tight sm:flex">
          <span className="text-sm text-star">{name || "Listener"}</span>
          <span className="font-mono text-xs text-faint">{email}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        onClick={onSignOut}
        disabled={signingOut}
        aria-label="Sign out"
        className="px-3"
      >
        <LogOut className="size-4" aria-hidden />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </div>
  );
}
