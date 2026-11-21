const SECRET_KEY = /token|secret|password|authorization|sign|app_key|appkey|credential/i;

export interface Logger {
  debug(obj: Record<string, unknown>, msg?: string): void;
  info(obj: Record<string, unknown>, msg?: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
  child(bindings: Record<string, unknown>): Logger;
}

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) out[key] = "[redacted]";
    else out[key] = redact(item);
  }
  return out;
}

export function createLogger(bindings: Record<string, unknown> = {}): Logger {
  const write = (level: string, obj: Record<string, unknown>, msg?: string) => {
    const line = JSON.stringify({
      time: new Date().toISOString(),
      level,
      ...bindings,
      ...(redact(obj) as Record<string, unknown>),
      ...(msg ? { msg } : {}),
    });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  };
  return {
    debug: (obj, msg) => write("debug", obj, msg),
    info: (obj, msg) => write("info", obj, msg),
    warn: (obj, msg) => write("warn", obj, msg),
    error: (obj, msg) => write("error", obj, msg),
    child: (extra) => createLogger({ ...bindings, ...extra }),
  };
}

export const silentLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
  child() {
    return silentLogger;
  },
};
