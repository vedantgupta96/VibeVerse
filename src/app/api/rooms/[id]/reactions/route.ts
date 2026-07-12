import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { react } from "@/server/services/rooms";
import { reactSchema, roomIdSchema } from "@/lib/schemas/room";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await requireUser(await headers());
    const id = roomIdSchema.parse((await params).id);
    const body = await request.json().catch(() => ({}));
    const { mood } = reactSchema.parse(body);

    await react({ id: user.id, name: user.name }, id, mood);
    return new Response(null, { status: 202 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
