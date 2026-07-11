"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import type { TasteMoodDTO } from "@/lib/dto";
import type { Mood } from "@/lib/moods";

const MOOD_COLOR: Record<Mood, string> = {
  joyful: "#f5a623",
  nostalgic: "#e14ecf",
  melancholy: "#6366f1",
  energetic: "#ef4444",
  calm: "#22d3ee",
  romantic: "#fb7185",
  gritty: "#a8a29e",
  dreamy: "#8b5cf6",
};

function orbBackground(moods: TasteMoodDTO[]): string {
  const colors = moods.slice(0, 3).map(({ mood }) => MOOD_COLOR[mood]);
  if (colors.length === 0) colors.push("#8b5cf6", "#22d3ee");
  if (colors.length === 1) colors.push("#14111f");
  return [
    `radial-gradient(circle at 32% 28%, rgba(242,239,255,.76), transparent 13%)`,
    `radial-gradient(circle at 28% 32%, ${colors[0]}, transparent 48%)`,
    `radial-gradient(circle at 72% 68%, ${colors[1]}, transparent 50%)`,
    colors[2] ? `radial-gradient(circle at 70% 25%, ${colors[2]}, transparent 44%)` : "",
    "#14111f",
  ]
    .filter(Boolean)
    .join(",");
}

export function TasteDnaOrb({
  archetype,
  moods,
  refreshing = false,
}: {
  archetype: string;
  moods: TasteMoodDTO[];
  refreshing?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const style = { background: orbBackground(moods) } satisfies CSSProperties;
  const shouldAnimate = refreshing && !reduceMotion;

  return (
    <div className="relative flex aspect-square w-full max-w-[23rem] items-center justify-center" aria-label={`Taste DNA: ${archetype}`}>
      <div className="absolute inset-[4%] rounded-full border border-aurora-violet/20" aria-hidden />
      <div className="absolute inset-[12%] rounded-full border border-star/10" aria-hidden />
      <motion.div
        className="relative flex size-[70%] items-center justify-center overflow-hidden rounded-full shadow-[0_0_44px_rgba(139,92,246,.22)]"
        style={style}
        animate={shouldAnimate ? { scale: [1, 1.018, 1] } : undefined}
        transition={
          shouldAnimate
            ? { duration: 2.4, ease: "easeInOut", repeat: Infinity }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-void/25" aria-hidden />
        <p className="relative max-w-[12rem] px-5 text-center font-display text-2xl font-semibold leading-tight tracking-[-.025em] text-star sm:text-3xl">
          {archetype}
        </p>
      </motion.div>
    </div>
  );
}
