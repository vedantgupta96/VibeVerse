"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const STATUSES = [
  "Reading your constellation…",
  "Asking the DJ…",
  "Finding the records…",
] as const;

const NODES = [
  { x: 22, y: 51, delay: 0 },
  { x: 39, y: 30, delay: 0.25 },
  { x: 58, y: 46, delay: 0.5 },
  { x: 74, y: 25, delay: 0.75 },
  { x: 82, y: 63, delay: 1 },
  { x: 48, y: 72, delay: 1.25 },
] as const;

export function GenerationProgress({ prompt }: { prompt: string }) {
  const [statusIndex, setStatusIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStatusIndex((current) => Math.min(current + 1, STATUSES.length - 1));
    }, 4_500);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      className="relative isolate overflow-hidden rounded-lg border border-border bg-space-1 px-5 py-10 sm:px-10 sm:py-14"
      aria-labelledby="generation-title"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(420px at 50% 50%, rgba(139,92,246,.16), transparent 68%)",
        }}
      />
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <motion.div
          className="relative mb-8 aspect-square w-52 sm:w-64"
          animate={reducedMotion ? undefined : { rotate: [0, 1.5, 0, -1.5, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          <div className="absolute inset-5 rounded-full border border-aurora-violet/20" />
          <div className="absolute inset-12 rounded-full border border-aurora-cyan/10" />
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
            <g stroke="rgba(169,159,196,.3)" strokeWidth=".45">
              <line x1="22" y1="51" x2="39" y2="30" />
              <line x1="39" y1="30" x2="58" y2="46" />
              <line x1="58" y1="46" x2="74" y2="25" />
              <line x1="58" y1="46" x2="82" y2="63" />
              <line x1="82" y1="63" x2="48" y2="72" />
              <line x1="48" y1="72" x2="22" y2="51" />
            </g>
          </svg>
          {NODES.map((node) => (
            <motion.span
              key={`${node.x}-${node.y}`}
              className="absolute size-2.5 rounded-full bg-aurora-cyan shadow-[0_0_12px_rgba(34,211,238,.75)]"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              animate={
                reducedMotion
                  ? undefined
                  : { scale: [0.75, 1.45, 0.75], opacity: [0.45, 1, 0.45] }
              }
              transition={{
                duration: 2.4,
                delay: node.delay,
                repeat: Infinity,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ))}
          <motion.span
            className="absolute left-1/2 top-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-aurora-violet/20 blur-md"
            animate={reducedMotion ? undefined : { scale: [0.7, 1.25, 0.7] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>

        <h2 id="generation-title" className="font-display text-2xl font-semibold">
          Your signal is live
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-stardust">
          “{prompt}”
        </p>
        <p
          className="mt-6 font-mono text-xs text-aurora-cyan"
          aria-live="polite"
          aria-atomic="true"
        >
          {STATUSES[statusIndex]}
        </p>
        <p className="mt-2 text-xs text-faint">This usually takes under 30 seconds.</p>
      </div>
    </section>
  );
}
