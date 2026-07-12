import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { addToQueue } from "@/server/services/room-queue";
import { addToQueueSchema, roomIdSchema } from "@/lib/schemas/room";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(await headers());
    const id = roomIdSchema.parse((await params).id);
    const body = await request.json().catch(() => ({}));
    const { providerId } = addToQueueSchema.parse(body);

    const item = await addToQueue(user.id, id, providerId);
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
