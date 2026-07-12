import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { touchPresence } from "@/server/services/rooms";
import { roomIdSchema } from "@/lib/schemas/room";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(await headers());
    const id = roomIdSchema.parse((await params).id);

    await touchPresence(user.id, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error, request);
  }
}
