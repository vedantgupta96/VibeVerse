import { pool } from "@/server/db";
import { env } from "@/lib/env";
import { ApiError, toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!env.DATABASE_URL) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "DATABASE_NOT_CONFIGURED",
          message: "Database is not configured",
        },
      },
      { status: 503 },
    );
  }

  try {
    await pool.query("SELECT 1");
    return Response.json({ ok: true });
  } catch {
    return toErrorResponse(new ApiError("INTERNAL", "Database unreachable"));
  }
}
