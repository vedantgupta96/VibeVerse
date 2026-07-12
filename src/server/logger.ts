import "server-only";

type LogLevel = "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const REDACTED = "[REDACTED]";
const SENSITIVE_KEY =
  /authorization|cookie|password|secret|token|api[_-]?key|database[_-]?(?:direct[_-]?)?url|raw[_-]?body/i;

function redactText(value: string): string {
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s@]+@/gi, "postgresql://[REDACTED]@")
    .replace(/Bearer\s+[^\s,]+/gi, "Bearer [REDACTED]")
    .slice(0, 2_000);
}

export function normalizeLogValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[MAX_DEPTH]";
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactText(value.message),
      ...(value.stack ? { stack: redactText(value.stack) } : {}),
      ...(value.cause !== undefined
        ? { cause: normalizeLogValue(value.cause, depth + 1) }
        : {}),
    };
  }
  if (typeof value === "string") return redactText(value);
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === undefined
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, 20)
      .map((item) => normalizeLogValue(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key)
          ? REDACTED
          : normalizeLogValue(item, depth + 1),
      ]),
    );
  }
  return String(value);
}

function write(level: LogLevel, event: string, context: LogContext = {}) {
  const normalizedContext = normalizeLogValue(context) as LogContext;
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...normalizedContext,
  };
  const method = level === "info" ? console.info : console[level];

  if (process.env.NODE_ENV === "production") {
    method(JSON.stringify(record));
    return;
  }
  method(`[${level}] ${event}`, normalizeLogValue(context));
}

export const logger = {
  info: (event: string, context?: LogContext) => write("info", event, context),
  warn: (event: string, context?: LogContext) => write("warn", event, context),
  error: (event: string, context?: LogContext) =>
    write("error", event, context),
};
