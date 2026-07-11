import { headers } from "next/headers";
import { toErrorResponse } from "@/lib/errors";
import { requireUser } from "@/server/auth";
import { refreshTasteProfile } from "@/server/services/taste";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireUser(await headers());
    const profile = await refreshTasteProfile(user.id);
    return Response.json({ profile });
  } catch (error) {
    return toErrorResponse(error);
  }
}
