import Link from "next/link";
import { SkipLink } from "@/components/layout/SkipLink";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SkipLink />
      <main
        id="main-content"
        tabIndex={-1}
        className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-12"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px at 50% 0%, rgba(139, 92, 246, 0.16), transparent 70%)",
          }}
        />
        <div className="relative w-full max-w-sm">
          <Link
            href="/"
            className="mb-8 block text-center font-display text-3xl font-semibold tracking-tight"
          >
            Vibe<span className="text-gradient-aurora">Verse</span>
          </Link>
          <div className="glass p-7">{children}</div>
        </div>
      </main>
    </>
  );
}
