import { headers } from "next/headers";
import { requireUser } from "@/server/auth";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

// Returns the current user, or the standard 401 envelope when unauthenticated.
// Also the reference for how Phase 4+ protected routes call requireUser().
export async function GET() {
  try {
    const user = await requireUser(await headers());
    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
