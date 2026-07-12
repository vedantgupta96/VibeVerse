import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { removeQueueItem } from "@/server/services/room-queue";
import { queueItemIdSchema, roomIdSchema } from "@/lib/schemas/room";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(await headers());
    const { id, itemId } = await params;
    const roomId = roomIdSchema.parse(id);
    const queueItemId = queueItemIdSchema.parse(itemId);

    await removeQueueItem(user.id, roomId, queueItemId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error, request);
  }
}
