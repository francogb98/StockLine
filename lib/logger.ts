import { reportError } from "@/lib/error-reporter";

type Level = "info" | "warn" | "error" | "critical";

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

export function log(
  level: Level,
  message: string,
  context?: Record<string, unknown>,
) {
  const line = {
    ts: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const stream = level === "error" || level === "critical" ? "stderr" : "stdout";
  const writer = stream === "stderr" ? process.stderr.write.bind(process.stderr) : process.stdout.write.bind(process.stdout);
  writer(`${safeJsonStringify(line)}\n`);

  if (level === "error" || level === "critical") {
    const severity = level === "critical" ? "CRITICAL" : "ERROR";
    void reportError({
      source: "API",
      severity,
      message,
      metadata: context,
    }).catch(() => {
      // never throw from log(): best-effort, swallow
    });
  }
}
