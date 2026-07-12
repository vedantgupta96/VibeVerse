import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { joinRoomByCode } from "@/server/services/rooms";
import { joinRoomByCodeSchema } from "@/lib/schemas/room";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser(await headers());
    const body = await request.json().catch(() => ({}));
    const { code } = joinRoomByCodeSchema.parse(body);

    const room = await joinRoomByCode({ id: user.id, name: user.name }, code);
    return Response.json({ room });
  } catch (error) {
    return toErrorResponse(error, request);
  }
}
