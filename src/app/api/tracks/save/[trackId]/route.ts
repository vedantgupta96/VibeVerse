import { headers } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/server/auth";
import { unsaveTrack } from "@/server/services/library";
import { ApiError, toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ trackId: string }> },
) {
  try {
    const user = await requireUser(await headers());
    const { trackId } = await params;
    z.string().uuid().parse(trackId);

    const removed = await unsaveTrack(user.id, trackId);
    if (!removed) {
      throw new ApiError("NOT_FOUND", "Track is not in your library");
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
