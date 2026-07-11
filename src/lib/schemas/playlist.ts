import { z } from "zod";

export const generatePlaylistSchema = z.object({
  prompt: z.string().trim().min(3).max(300),
});

export const playlistIdSchema = z.string().uuid();

export type GeneratePlaylistInput = z.infer<typeof generatePlaylistSchema>;
