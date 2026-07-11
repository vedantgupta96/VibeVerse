import { headers } from "next/headers";
import { toErrorResponse } from "@/lib/errors";
import { requireUser } from "@/server/auth";
import { listPlaylists } from "@/server/services/playlists";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser(await headers());
    const playlists = await listPlaylists(user.id);
    return Response.json({ playlists });
  } catch (error) {
    return toErrorResponse(error);
  }
}
