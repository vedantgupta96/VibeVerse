import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { generateRoomVibe } from "@/server/services/rooms";
import { roomIdSchema } from "@/lib/schemas/room";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(await headers());
    const id = roomIdSchema.parse((await params).id);

    const result = await generateRoomVibe(user.id, id);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
