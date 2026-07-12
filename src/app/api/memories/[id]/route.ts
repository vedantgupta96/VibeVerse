import { headers } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { deleteMemory, updateMemory } from "@/server/services/memories";
import { updateMemorySchema } from "@/lib/schemas/memory";
import { ApiError, toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(await headers());
    const { id } = await params;
    idSchema.parse(id);
    const body = await request.json().catch(() => ({}));
    const input = updateMemorySchema.parse(body);

    const memory = await updateMemory(user.id, id, input);
    return Response.json({ memory });
  } catch (error) {
    return toErrorResponse(error, request);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(await headers());
    const { id } = await params;
    idSchema.parse(id);

    const removed = await deleteMemory(user.id, id);
    if (!removed) throw new ApiError("NOT_FOUND", "Memory not found");
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error, request);
  }
}
