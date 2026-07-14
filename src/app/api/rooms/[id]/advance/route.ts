import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { advanceNowPlaying } from "@/server/services/room-queue";
import { advanceNowPlayingSchema, roomIdSchema } from "@/lib/schemas/room";
import { ApiError, toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

async function parseExpectedNowPlayingId(
  request: Request,
): Promise<string | null | undefined> {
  const rawBody = await request.text();
  if (rawBody.trim() === "") return undefined;

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Invalid JSON body");
  }

  return advanceNowPlayingSchema.parse(body).expectedNowPlayingId;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(await headers());
    const id = roomIdSchema.parse((await params).id);
    const expectedNowPlayingId = await parseExpectedNowPlayingId(request);

    const nowPlaying = await advanceNowPlaying(
      user.id,
      id,
      expectedNowPlayingId,
    );
    return Response.json({ nowPlaying });
  } catch (error) {
    return toErrorResponse(error, request);
  }
}
