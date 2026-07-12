import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { createRoom, listRooms } from "@/server/services/rooms";
import { createRoomSchema, roomListQuerySchema } from "@/lib/schemas/room";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser(await headers());
    const body = await request.json().catch(() => ({}));
    const { name } = createRoomSchema.parse(body);

    const room = await createRoom(user.id, name);
    return Response.json({ room }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(request: Request) {
  try {
    await requireUser(await headers());
    const { searchParams } = new URL(request.url);
    const { cursor, limit } = roomListQuerySchema.parse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const result = await listRooms(cursor, limit);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
