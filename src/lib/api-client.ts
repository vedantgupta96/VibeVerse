import type { ErrorCode } from "@/lib/errors";

export class ApiClientError extends Error {
  constructor(
    public code: ErrorCode | "INTERNAL",
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * Typed fetch for client components. Parses the standard error envelope into an
 * ApiClientError so callers (and TanStack Query) get code/status, not raw text.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let code: ApiClientError["code"] = "INTERNAL";
    let message = res.statusText || "Request failed";
    let details: unknown;
    try {
      const body = await res.json();
      if (body?.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
        details = body.error.details;
      }
    } catch {
      // non-JSON error body — keep the status text
    }
    throw new ApiClientError(code, message, res.status, details);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
