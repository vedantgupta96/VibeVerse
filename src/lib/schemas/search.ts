import { z } from "zod";

export const searchTypeSchema = z.enum(["track", "artist"]);
export type SearchType = z.infer<typeof searchTypeSchema>;

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  type: searchTypeSchema.default("track"),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;
