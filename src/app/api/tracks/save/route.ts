import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { saveTrackByProviderId } from "@/server/services/library";
import { saveTrackSchema } from "@/lib/schemas/library";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser(await headers());
    const body = await request.json().catch(() => ({}));
    const { providerId } = saveTrackSchema.parse(body);

    const { track, created } = await saveTrackByProviderId(user.id, providerId);
    return Response.json({ track }, { status: created ? 201 : 200 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
