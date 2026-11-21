export interface DarazErrorOptions {
  code: string;
  message: string;
  requestId?: string;
  type?: string;
  httpStatus?: number;
  retryable?: boolean;
  auth?: boolean;
}

const AUTH_CODES = new Set([
  "IllegalAccessToken",
  "InvalidSession",
  "AccessTokenExpired",
  "MissingAccessToken",
]);

export class DarazError extends Error {
  readonly code: string;
  readonly requestId?: string;
  readonly type?: string;
  readonly httpStatus?: number;
  readonly retryable: boolean;
  readonly auth: boolean;

  constructor(options: DarazErrorOptions) {
    super(options.message);
    this.name = "DarazError";
    this.code = options.code;
    this.requestId = options.requestId;
    this.type = options.type;
    this.httpStatus = options.httpStatus;
    this.retryable = options.retryable ?? false;
    this.auth = options.auth ?? AUTH_CODES.has(options.code);
  }
}

export function isThrottleCode(code: string | undefined, message: string | undefined): boolean {
  if (!code && !message) return false;
  const blob = `${code ?? ""} ${message ?? ""}`;
  return code === "901" || blob.includes("E901") || /too frequent/i.test(blob);
}

export function isAuthCode(code: string | undefined, message: string | undefined): boolean {
  if (code && AUTH_CODES.has(code)) return true;
  const blob = `${code ?? ""} ${message ?? ""}`;
  return [...AUTH_CODES].some((item) => blob.includes(item));
}
