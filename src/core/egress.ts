import { redactDeep, redactSecret } from "./redact.js";
import { assertSafeHttpsUrl, type LookupFn } from "./ssrf.js";

export const MAX_BODY_BYTES = 1024 * 1024;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type AuthType = "Bearer" | "Header" | "Query";

export type EgressInput = {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  authType?: AuthType;
  headerName?: string;
  queryParamName?: string;
  secret: string;
  allowedDomains: string[];
};

export type EgressResult = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
};

export type EgressDeps = {
  fetch?: typeof fetch;
  lookup?: LookupFn;
};

const BINARY_TYPES = [
  "image/",
  "audio/",
  "video/",
  "application/pdf",
  "application/zip",
  "application/gzip",
  "application/octet-stream",
  "application/x-zip-compressed",
];

export async function confidentialFetch(
  input: EgressInput,
  deps: EgressDeps = {},
): Promise<EgressResult> {
  const fetchImpl = deps.fetch ?? fetch;
  const method = input.method ?? "GET";
  const authType = input.authType ?? "Bearer";
  const headerName = input.headerName ?? "Authorization";
  const queryParamName = input.queryParamName ?? "api_key";

  const parsed = await assertSafeHttpsUrl(input.url, input.allowedDomains, deps.lookup);
  const headers = new Headers(input.headers);
  const target = new URL(parsed.toString());

  if (authType === "Query") {
    target.searchParams.set(queryParamName, input.secret);
  } else if (authType === "Bearer") {
    headers.set(headerName, `Bearer ${input.secret}`);
  } else {
    headers.set(headerName, input.secret);
  }

  const init: RequestInit = {
    method,
    headers,
    redirect: "manual",
  };

  if (method !== "GET" && method !== "DELETE" && input.body !== undefined) {
    if (typeof input.body === "string") {
      init.body = input.body;
    } else {
      init.body = JSON.stringify(input.body);
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }
    }
  }

  let response: Response;
  try {
    response = await fetchImpl(target, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    throw new Error(redactSecret(message, input.secret));
  }

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = redactSecret(value, input.secret);
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (isBinaryContentType(contentType)) {
    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data: "Binary content omitted from context",
    };
  }

  const buffer = await readLimitedBody(response);
  const text = new TextDecoder().decode(buffer);
  let data: unknown = redactSecret(text, input.secret);
  try {
    data = redactDeep(JSON.parse(text), input.secret);
  } catch {
    // keep redacted text
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    data,
  };
}

function isBinaryContentType(contentType: string): boolean {
  const type = contentType.toLowerCase();
  return BINARY_TYPES.some((prefix) => type.startsWith(prefix) || type.includes(prefix));
}

async function readLimitedBody(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) {
    const fallback = new Uint8Array(await response.arrayBuffer());
    if (fallback.byteLength > MAX_BODY_BYTES) {
      return fallback.slice(0, MAX_BODY_BYTES);
    }
    return fallback;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BODY_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) {
      break;
    }
    const remaining = MAX_BODY_BYTES - total;
    chunks.push(value.byteLength > remaining ? value.slice(0, remaining) : value);
    total += Math.min(value.byteLength, remaining);
    if (value.byteLength > remaining) {
      break;
    }
  }
  await reader.cancel().catch(() => undefined);

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}
