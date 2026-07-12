import { headers } from "next/headers";
import { toErrorResponse } from "@/lib/errors";
import { requireUser } from "@/server/auth";
import { getGalaxy } from "@/server/services/galaxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(await headers());
    return Response.json(await getGalaxy(user.id));
  } catch (error) {
    return toErrorResponse(error, request);
  }
}
