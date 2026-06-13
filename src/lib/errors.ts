import { z, ZodError } from "zod";

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "PROVIDER_UNAVAILABLE"
  | "AI_UNAVAILABLE"
  | "AI_REFUSED"
  | "RATE_LIMITED"
  | "INTERNAL";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  PROVIDER_UNAVAILABLE: 502,
  AI_UNAVAILABLE: 502,
  AI_REFUSED: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message?: string, details?: unknown) {
    super(message ?? code);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

type ErrorEnvelope = {
  error: { code: ErrorCode; message: string; details?: unknown };
};

function envelope(
  code: ErrorCode,
  message: string,
  details?: unknown,
): ErrorEnvelope {
  return {
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(envelope(error.code, error.message, error.details), {
      status: error.status,
    });
  }
  if (error instanceof ZodError) {
    return Response.json(
      envelope("VALIDATION_ERROR", "Invalid input", {
        fieldErrors: z.flattenError(error).fieldErrors,
      }),
      { status: 400 },
    );
  }
  console.error("[api] unexpected error:", error);
  return Response.json(envelope("INTERNAL", "Something went wrong"), {
    status: 500,
  });
}
