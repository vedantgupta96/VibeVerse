import { z } from "zod";
import { MOODS } from "@/lib/moods";

export const roomIdSchema = z.string().uuid();
export const queueItemIdSchema = z.string().uuid();

export const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const roomListQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Normalizes user input (trims whitespace, uppercases) so a code copy-pasted
// with stray casing/whitespace still resolves. The DB lookup — not this
// schema — is the source of truth for whether a code exists.
export const joinRoomByCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .transform((value) => value.toUpperCase()),
});

export const voteValueSchema = z.union([z.literal(1), z.literal(-1)]);

export const castVoteSchema = z.object({
  value: voteValueSchema,
});

export const addToQueueSchema = z.object({
  providerId: z.string().trim().min(1).max(50),
});

export const advanceNowPlayingSchema = z
  .object({
    expectedNowPlayingId: queueItemIdSchema.nullable(),
  })
  .strict();

export const reactSchema = z.object({
  mood: z.enum(MOODS),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomByCodeInput = z.infer<typeof joinRoomByCodeSchema>;
export type CastVoteInput = z.infer<typeof castVoteSchema>;
export type AddToQueueInput = z.infer<typeof addToQueueSchema>;
export type AdvanceNowPlayingInput = z.infer<typeof advanceNowPlayingSchema>;
export type ReactInput = z.infer<typeof reactSchema>;
