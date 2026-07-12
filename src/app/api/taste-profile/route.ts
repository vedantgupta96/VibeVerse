import { headers } from "next/headers";
import { toErrorResponse } from "@/lib/errors";
import { requireUser } from "@/server/auth";
import { getTasteProfile } from "@/server/services/taste";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser(await headers());
    const profile = await getTasteProfile(user.id);
    return Response.json({ profile });
  } catch (error) {
    return toErrorResponse(error, request);
  }
}
