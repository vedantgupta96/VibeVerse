import { headers } from "next/headers";
import { toErrorResponse } from "@/lib/errors";
import { generatePlaylistSchema } from "@/lib/schemas/playlist";
import { requireUser } from "@/server/auth";
import { generatePlaylist } from "@/server/services/playlists";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser(await headers());
    const body = await request.json().catch(() => ({}));
    const { prompt } = generatePlaylistSchema.parse(body);
    const playlist = await generatePlaylist(user.id, prompt);
    return Response.json({ playlist }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
