import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { advanceNowPlaying } from "@/server/services/room-queue";
import { roomIdSchema } from "@/lib/schemas/room";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(await headers());
    const id = roomIdSchema.parse((await params).id);

    const nowPlaying = await advanceNowPlaying(user.id, id);
    return Response.json({ nowPlaying });
  } catch (error) {
    return toErrorResponse(error);
  }
}
