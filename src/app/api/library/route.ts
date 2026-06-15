import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { listLibrary } from "@/server/services/library";
import { libraryQuerySchema } from "@/lib/schemas/library";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(await headers());
    const { searchParams } = new URL(request.url);
    const { cursor, limit } = libraryQuerySchema.parse({
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const result = await listLibrary(user.id, cursor, limit);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
