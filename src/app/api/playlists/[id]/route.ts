import { headers } from "next/headers";
import { ApiError, toErrorResponse } from "@/lib/errors";
import { playlistIdSchema } from "@/lib/schemas/playlist";
import { requireUser } from "@/server/auth";
import {
  deletePlaylist,
  getPlaylist,
} from "@/server/services/playlists";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(await headers());
    const id = playlistIdSchema.parse((await params).id);
    const playlist = await getPlaylist(user.id, id);
    return Response.json({ playlist });
  } catch (error) {
    return toErrorResponse(error, request);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(await headers());
    const id = playlistIdSchema.parse((await params).id);
    const removed = await deletePlaylist(user.id, id);
    if (!removed) throw new ApiError("NOT_FOUND", "Playlist not found");
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error, request);
  }
}
