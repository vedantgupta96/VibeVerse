const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function isSafeRequestId(value: string | null | undefined): value is string {
  return typeof value === "string" && SAFE_REQUEST_ID.test(value);
}

export function resolveRequestId(
  incoming: string | null | undefined,
  generate: () => string = crypto.randomUUID,
): string {
  return isSafeRequestId(incoming) ? incoming : generate();
}
