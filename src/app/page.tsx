export default function LandingPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6">
      {/* Nebula glow anchored to the hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(600px at 50% 20%, rgba(139, 92, 246, 0.15), transparent 70%)",
        }}
      />

      <div className="relative flex max-w-2xl flex-col items-center text-center">
        <span className="glass rounded-full px-4 py-1.5 font-mono text-xs tracking-wider text-stardust">
          PHASE 1 · SYSTEMS ONLINE
        </span>

        <h1 className="mt-8 font-display text-6xl font-semibold tracking-tight sm:text-7xl">
          Vibe<span className="text-gradient-aurora">Verse</span>
        </h1>

        <p className="mt-6 max-w-md text-lg leading-relaxed text-stardust">
          Your music as a living galaxy. AI playlists, song memories, and a
          taste map of everything you love.
        </p>

        <a
          href="#"
          className="gradient-aurora mt-10 rounded-full px-8 py-3 font-medium text-void transition-transform duration-150 ease-out hover:scale-[1.03]"
        >
          Enter the verse
        </a>

        <p className="mt-16 font-mono text-xs text-faint">
          auth · search · memories · ai dj · taste dna · galaxy — arriving in
          phases
        </p>
      </div>
    </main>
  );
}
