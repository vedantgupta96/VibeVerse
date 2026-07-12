import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { joinRoom } from "@/server/services/rooms";
import { roomIdSchema } from "@/lib/schemas/room";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(await headers());
    const id = roomIdSchema.parse((await params).id);

    const room = await joinRoom({ id: user.id, name: user.name }, id);
    return Response.json({ room });
  } catch (error) {
    return toErrorResponse(error, request);
  }
}
