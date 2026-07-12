"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MOOD_BG, MOOD_LABEL } from "@/lib/moods";
import type { RoomEvent } from "@/lib/realtime";

export type FloatingReaction = {
  id: string;
  event: Extract<RoomEvent, { type: "reaction" }>;
};

// Deterministic-ish horizontal spread so a burst of reactions doesn't all
// stack on the same spot, without needing to track layout/measurement.
function hashToPercent(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return 8 + (hash % 84); // keep within 8%-92% horizontally
}

export function ReactionOverlay({ reactions }: { reactions: FloatingReaction[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {reactions.map(({ id, event }) => (
          <motion.div
            key={id}
            initial={{ opacity: 0 }}
            animate={
              reduceMotion
                ? { opacity: [0, 1, 1, 0] }
                : { opacity: [0, 1, 1, 0], y: -160 }
            }
            transition={{ duration: 3, ease: "easeOut" }}
            className="glass absolute bottom-10 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-star"
            style={{ left: `${hashToPercent(id)}%` }}
          >
            <span className={`size-2 rounded-full ${MOOD_BG[event.mood]}`} />
            {event.name.split(" ")[0]} · {MOOD_LABEL[event.mood]}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
