import { z, ZodError } from "zod";
import { logger } from "@/server/logger";

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

function errorContext(request?: Request) {
  if (!request) return {};
  return {
    route: new URL(request.url).pathname,
    method: request.method,
    requestId: request.headers.get("x-request-id") ?? undefined,
  };
}

function failureResponse(
  code: ErrorCode,
  message: string,
  status: number,
  error: unknown,
  request?: Request,
): Response {
  const errorId = crypto.randomUUID();
  logger.error("api.request_failed", {
    ...errorContext(request),
    errorId,
    code,
    error,
  });
  return Response.json(envelope(code, message, { errorId }), {
    status,
    headers: { "x-error-id": errorId },
  });
}

export function toErrorResponse(error: unknown, request?: Request): Response {
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      return failureResponse(
        error.code,
        error.message,
        error.status,
        error,
        request,
      );
    }
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
  return failureResponse(
    "INTERNAL",
    "Something went wrong",
    500,
    error,
    request,
  );
}
