import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { searchMemories } from "@/server/services/memories";
import { memorySearchSchema } from "@/lib/schemas/memory";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(await headers());
    const { searchParams } = new URL(request.url);
    const { q } = memorySearchSchema.parse({ q: searchParams.get("q") ?? "" });

    const memories = await searchMemories(user.id, q);
    return Response.json({ memories });
  } catch (error) {
    return toErrorResponse(error, request);
  }
}
