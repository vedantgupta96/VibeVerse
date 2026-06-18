import { z } from "zod";
import { MOODS } from "@/lib/moods";

export const moodSchema = z.enum(MOODS);

export const createMemorySchema = z.object({
  trackId: z.string().uuid(),
  content: z.string().trim().min(1).max(2000),
  mood: moodSchema.nullable().default(null),
});

export const updateMemorySchema = z
  .object({
    content: z.string().trim().min(1).max(2000).optional(),
    mood: moodSchema.nullable().optional(),
  })
  .refine((v) => v.content !== undefined || v.mood !== undefined, {
    message: "Provide content or mood to update",
  });

export const memoryListQuerySchema = z.object({
  trackId: z.string().uuid().optional(),
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export const memorySearchSchema = z.object({
  q: z.string().trim().min(1).max(200),
});

export type CreateMemoryInput = z.infer<typeof createMemorySchema>;
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;
