import { randomUUID } from "node:crypto";

type Level = "info" | "warn" | "error";

export function requestId(request: Request): string {
  const incoming = request.headers.get("x-request-id")?.trim();
  return incoming && incoming.length <= 128 ? incoming : randomUUID();
}

export function logEvent(level: Level, event: string, fields: Record<string, unknown> = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: "hodgeform",
    event,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
