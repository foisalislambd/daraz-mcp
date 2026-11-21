import { DarazError, isAuthCode, isThrottleCode } from "./errors.js";
import { createLogger, silentLogger, type Logger } from "./logger.js";
import { getRegion, type RegionCode } from "./regions.js";
import { cleanParams, signRequest, type SignParams } from "./sign.js";

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: number;
}

export interface DarazClientOptions {
  region: RegionCode | string;
  appKey: string;
  appSecret: string;
  accessToken?: string;
  refreshToken?: string;
  /** Unix milliseconds when the access token expires. */
  accessTokenExpiresAt?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
  logger?: Logger;
  /** Called after a successful refresh so the caller can persist new tokens. */
  onTokensUpdated?: (tokens: TokenSet) => void | Promise<void>;
  maxRetries?: number;
  /** Override the REST base, used by tests. */
  restBase?: string;
  /** Refresh this many milliseconds before expiry. */
  refreshSkewMs?: number;
}

export interface DarazEnvelope<T = unknown> {
  code: string;
  message?: string;
  type?: string;
  request_id?: string;
  data?: T;
  [key: string]: unknown;
}

export interface RequestOptions {
  method?: "GET" | "POST";
  path: string;
  params?: Record<string, string | number | boolean | null | undefined>;
  /** When false, access_token is omitted. Token endpoints use this. */
  authenticated?: boolean;
  file?: {
    field: string;
    filename: string;
    contentType: string;
    bytes: Uint8Array;
  };
  signal?: AbortSignal;
}

const RETRYABLE_HTTP = new Set([408, 429, 500, 502, 503, 504]);

export class DarazClient {
  readonly regionCode: RegionCode;
  readonly appKey: string;
  private readonly appSecret: string;
  private accessToken?: string;
  private refreshToken?: string;
  private accessTokenExpiresAt?: number;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly logger: Logger;
  private readonly onTokensUpdated?: DarazClientOptions["onTokensUpdated"];
  private readonly maxRetries: number;
  private readonly restBase: string;
  private readonly refreshSkewMs: number;
  private refreshInflight: Promise<void> | null = null;

  constructor(options: DarazClientOptions) {
    const region = getRegion(options.region);
    this.regionCode = region.code;
    this.appKey = options.appKey;
    this.appSecret = options.appSecret;
    this.accessToken = options.accessToken;
    this.refreshToken = options.refreshToken;
    this.accessTokenExpiresAt = options.accessTokenExpiresAt;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
    this.logger = options.logger ?? silentLogger;
    this.onTokensUpdated = options.onTokensUpdated;
    this.maxRetries = options.maxRetries ?? 3;
    this.restBase = (options.restBase ?? region.restBase).replace(/\/$/, "");
    this.refreshSkewMs = options.refreshSkewMs ?? 60_000;
  }

  get tokens(): TokenSet {
    return {
      accessToken: this.accessToken ?? "",
      ...(this.refreshToken ? { refreshToken: this.refreshToken } : {}),
      ...(this.accessTokenExpiresAt ? { accessTokenExpiresAt: this.accessTokenExpiresAt } : {}),
    };
  }

  async request<T = unknown>(options: RequestOptions): Promise<DarazEnvelope<T>> {
    const authenticated = options.authenticated !== false;
    if (authenticated) await this.ensureFreshToken();

    let authRetried = false;
    let attempt = 0;
    for (;;) {
      try {
        const envelope = await this.send<T>(options, authenticated);
        if (envelope.code !== "0") {
          const error = this.toApiError(envelope);
          if (error.auth && authenticated && !authRetried && this.refreshToken) {
            authRetried = true;
            await this.refreshAccessToken();
            continue;
          }
          if (error.retryable && attempt < this.maxRetries) {
            await sleep(backoffMs(attempt, undefined));
            attempt += 1;
            continue;
          }
          throw error;
        }
        return envelope;
      } catch (error) {
        if (error instanceof DarazError) {
          if (error.auth && authenticated && !authRetried && this.refreshToken) {
            authRetried = true;
            await this.refreshAccessToken();
            continue;
          }
          if (error.retryable && attempt < this.maxRetries) {
            await sleep(backoffMs(attempt, retryAfterFrom(error)));
            attempt += 1;
            continue;
          }
          throw error;
        }
        if (attempt < this.maxRetries && isNetworkError(error)) {
          this.logger.warn({ path: options.path, attempt }, "Daraz network error, retrying");
          await sleep(backoffMs(attempt, undefined));
          attempt += 1;
          continue;
        }
        throw error;
      }
    }
  }

  async createToken(code: string): Promise<DarazEnvelope> {
    const envelope = await this.request({
      method: "POST",
      path: "/auth/token/create",
      authenticated: false,
      params: { code },
    });
    this.absorbTokenEnvelope(envelope);
    return envelope;
  }

  async refreshAccessToken(): Promise<DarazEnvelope> {
    if (!this.refreshToken) throw new Error("No refresh token is available.");
    if (this.refreshInflight) {
      await this.refreshInflight;
      return { code: "0" };
    }
    const run = (async () => {
      const envelope = await this.send(
        {
          method: "POST",
          path: "/auth/token/refresh",
          authenticated: false,
          params: { refresh_token: this.refreshToken },
        },
        false,
      );
      if (String(envelope.code ?? "0") !== "0") {
        throw this.toApiError(envelope);
      }
      this.absorbTokenEnvelope(envelope);
    })();
    this.refreshInflight = run.finally(() => {
      this.refreshInflight = null;
    });
    await this.refreshInflight;
    return { code: "0" };
  }

  private async ensureFreshToken(): Promise<void> {
    if (!this.accessToken) return;
    if (!this.refreshToken || !this.accessTokenExpiresAt) return;
    if (this.accessTokenExpiresAt - this.now() > this.refreshSkewMs) return;
    await this.refreshAccessToken();
  }

  private absorbTokenEnvelope(envelope: DarazEnvelope): void {
    const access = stringField(envelope, "access_token");
    const refresh = stringField(envelope, "refresh_token");
    const expiresIn = numberField(envelope, "expires_in");
    if (!access) return;
    this.accessToken = access;
    if (refresh) this.refreshToken = refresh;
    if (expiresIn) this.accessTokenExpiresAt = this.now() + expiresIn * 1000;
    void this.onTokensUpdated?.(this.tokens);
  }

  private async send<T>(options: RequestOptions, authenticated: boolean): Promise<DarazEnvelope<T>> {
    const params = cleanParams({
      app_key: this.appKey,
      sign_method: "sha256",
      timestamp: String(this.now()),
      ...(authenticated && this.accessToken ? { access_token: this.accessToken } : {}),
      ...options.params,
    });
    const signature = signRequest(this.appSecret, options.path, params);
    const signed: SignParams = { ...params, sign: signature };
    const method = options.method ?? "GET";
    const url = new URL(this.restBase + options.path);
    const started = this.now();

    let response: Response;
    if (options.file) {
      const form = new FormData();
      for (const [key, value] of Object.entries(signed)) form.set(key, value);
      const bytes = new Uint8Array(options.file.bytes);
      form.set(
        options.file.field,
        new Blob([bytes], { type: options.file.contentType }),
        options.file.filename,
      );
      response = await this.fetchImpl(url, { method: "POST", body: form, signal: options.signal });
    } else if (method === "GET") {
      for (const [key, value] of Object.entries(signed)) url.searchParams.set(key, value);
      response = await this.fetchImpl(url, { method: "GET", signal: options.signal });
    } else {
      const body = new URLSearchParams(signed);
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        signal: options.signal,
      });
    }

    const text = await response.text();
    let parsed: DarazEnvelope<T>;
    try {
      parsed = JSON.parse(text) as DarazEnvelope<T>;
    } catch {
      throw new DarazError({
        code: `HTTP_${response.status}`,
        message: `Daraz returned a non-JSON response (${response.status}).`,
        httpStatus: response.status,
        retryable: RETRYABLE_HTTP.has(response.status),
      });
    }
    parsed.code = String(parsed.code ?? "");
    this.logger.info(
      {
        path: options.path,
        region: this.regionCode,
        httpStatus: response.status,
        code: parsed.code,
        requestId: parsed.request_id,
        durationMs: this.now() - started,
      },
      "daraz request",
    );

    if (!response.ok && parsed.code === "") {
      throw new DarazError({
        code: `HTTP_${response.status}`,
        message: parsed.message || `Daraz HTTP ${response.status}`,
        httpStatus: response.status,
        requestId: parsed.request_id,
        retryable: RETRYABLE_HTTP.has(response.status),
      });
    }
    if (!response.ok && parsed.code === "0") {
      throw new DarazError({
        code: `HTTP_${response.status}`,
        message: parsed.message || `Daraz HTTP ${response.status}`,
        httpStatus: response.status,
        requestId: parsed.request_id,
        retryable: RETRYABLE_HTTP.has(response.status),
      });
    }
    if (RETRYABLE_HTTP.has(response.status) && parsed.code !== "0") {
      const error = this.toApiError(parsed, response.status);
      errorRetryable(error, response);
      throw error;
    }
    return parsed;
  }

  private toApiError(envelope: DarazEnvelope, httpStatus?: number): DarazError {
    const message = envelope.message || `Daraz error ${envelope.code || "unknown"}`;
    const retryable = isThrottleCode(envelope.code, message) || (httpStatus ? RETRYABLE_HTTP.has(httpStatus) : false);
    return new DarazError({
      code: envelope.code || "unknown",
      message,
      requestId: envelope.request_id,
      type: envelope.type,
      httpStatus,
      retryable,
      auth: isAuthCode(envelope.code, message),
    });
  }
}

function errorRetryable(error: DarazError, response: Response): void {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) {
      (error as DarazError & { retryAfterMs?: number }).retryAfterMs = seconds * 1000;
    }
  }
}

function retryAfterFrom(error: DarazError): number | undefined {
  return (error as DarazError & { retryAfterMs?: number }).retryAfterMs;
}

function backoffMs(attempt: number, retryAfter: number | undefined): number {
  if (retryAfter && retryAfter > 0) return Math.min(retryAfter, 30_000);
  const base = 200 * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 100);
  return Math.min(8_000, base + jitter);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError || (error instanceof Error && /fetch|network|ECONN/i.test(error.message));
}

function stringField(envelope: DarazEnvelope, key: string): string | undefined {
  const top = envelope[key];
  if (typeof top === "string" && top) return top;
  const data = envelope.data;
  if (data && typeof data === "object" && key in data) {
    const value = (data as Record<string, unknown>)[key];
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}

function numberField(envelope: DarazEnvelope, key: string): number | undefined {
  const read = (value: unknown) => {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    return Number.isFinite(n) ? n : undefined;
  };
  return read(envelope[key]) ?? (envelope.data && typeof envelope.data === "object"
    ? read((envelope.data as Record<string, unknown>)[key])
    : undefined);
}

export function createLoggerForRegion(region: string): Logger {
  return createLogger({ component: "daraz-client", region });
}
