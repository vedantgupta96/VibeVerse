import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { createMemory, listMemories } from "@/server/services/memories";
import {
  createMemorySchema,
  memoryListQuerySchema,
} from "@/lib/schemas/memory";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser(await headers());
    const body = await request.json().catch(() => ({}));
    const input = createMemorySchema.parse(body);

    const memory = await createMemory(user.id, input);
    return Response.json({ memory }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, request);
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(await headers());
    const { searchParams } = new URL(request.url);
    const { trackId, cursor, limit } = memoryListQuerySchema.parse({
      trackId: searchParams.get("trackId") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const result = await listMemories(user.id, { trackId, cursor, limit });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error, request);
  }
}
