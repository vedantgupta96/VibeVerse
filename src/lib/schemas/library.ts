import { z } from "zod";

export const saveTrackSchema = z.object({
  provider: z.literal("deezer"),
  providerId: z.string().min(1).max(64),
});
export type SaveTrackInput = z.infer<typeof saveTrackSchema>;

export const libraryQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});
