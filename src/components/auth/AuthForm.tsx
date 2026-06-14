"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "signup";

export function AuthForm({
  mode,
  googleEnabled,
}: {
  mode: Mode;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = isSignup
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? "Something went wrong. Try again.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError(null);
    await authClient.signIn.social({ provider: "google", callbackURL: next });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {isSignup && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nova Cassini"
            autoComplete="name"
            required
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@vibeverse.app"
          autoComplete="email"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isSignup ? "At least 8 characters" : "••••••••"}
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={8}
          required
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading} className="mt-1 w-full">
        {loading
          ? "One moment…"
          : isSignup
            ? "Create account"
            : "Sign in"}
      </Button>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onGoogle}
          >
            Continue with Google
          </Button>
        </>
      )}

      <p className="text-center text-sm text-stardust">
        {isSignup ? "Already have an account? " : "New to VibeVerse? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="text-aurora-cyan hover:underline"
        >
          {isSignup ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
