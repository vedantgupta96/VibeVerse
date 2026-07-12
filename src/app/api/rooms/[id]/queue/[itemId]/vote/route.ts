import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { castVote, clearVote } from "@/server/services/room-queue";
import { castVoteSchema, queueItemIdSchema, roomIdSchema } from "@/lib/schemas/room";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(await headers());
    const { id, itemId } = await params;
    const roomId = roomIdSchema.parse(id);
    const queueItemId = queueItemIdSchema.parse(itemId);
    const body = await request.json().catch(() => ({}));
    const { value } = castVoteSchema.parse(body);

    const item = await castVote(user.id, roomId, queueItemId, value);
    return Response.json({ item });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(await headers());
    const { id, itemId } = await params;
    const roomId = roomIdSchema.parse(id);
    const queueItemId = queueItemIdSchema.parse(itemId);

    await clearVote(user.id, roomId, queueItemId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
