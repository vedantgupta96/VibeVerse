import { pool } from "@/server/db";
import { env } from "@/lib/env";
import { toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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
  } catch (error) {
    return toErrorResponse(error, request);
  }
}
