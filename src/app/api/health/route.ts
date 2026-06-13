import { pool } from "@/server/db";
import { ApiError, toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pool.query("SELECT 1");
    return Response.json({ ok: true });
  } catch {
    return toErrorResponse(new ApiError("INTERNAL", "Database unreachable"));
  }
}
