import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { musicProvider } from "@/server/music/deezer";
import { enrichTracks } from "@/server/services/tracks";
import { searchQuerySchema } from "@/lib/schemas/search";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(await headers());

    const { searchParams } = new URL(request.url);
    const { q, type } = searchQuerySchema.parse({
      q: searchParams.get("q") ?? "",
      type: searchParams.get("type") ?? "track",
    });

    if (type === "artist") {
      const artists = await musicProvider.searchArtists(q, 20);
      return Response.json({
        artists: artists.map((a) => ({
          providerId: a.providerId,
          name: a.name,
          imageUrl: a.imageUrl,
          genres: a.genres,
        })),
      });
    }

    const providerTracks = await musicProvider.searchTracks(q, 20);
    const tracks = await enrichTracks(user.id, providerTracks);
    return Response.json({ tracks });
  } catch (error) {
    return toErrorResponse(error);
  }
}
