import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { isGoogleAuthEnabled } from "@/server/auth";

export const metadata = { title: "Sign in · VibeVerse" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-medium">Welcome back</h1>
        <p className="text-sm text-stardust">
          Sign in to return to your universe.
        </p>
      </header>
      <Suspense>
        <AuthForm mode="login" googleEnabled={isGoogleAuthEnabled} />
      </Suspense>
    </div>
  );
}
