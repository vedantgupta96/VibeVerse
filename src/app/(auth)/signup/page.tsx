import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { isGoogleAuthEnabled } from "@/server/auth";

export const metadata = { title: "Create account · VibeVerse" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-medium">Begin your verse</h1>
        <p className="text-sm text-stardust">
          Create an account to start mapping your taste.
        </p>
      </header>
      <Suspense>
        <AuthForm mode="signup" googleEnabled={isGoogleAuthEnabled} />
      </Suspense>
    </div>
  );
}
