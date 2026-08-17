import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

export type LookupFn = (hostname: string) => Promise<string[]>;

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "0.0.0.0",
  "169.254.169.254",
  "metadata.google.internal",
]);

export function normalizeDomain(domain: string): string {
  const trimmed = domain.trim().toLowerCase().replace(/\.+$/, "");
  if (!trimmed || trimmed.includes("/") || trimmed.includes(":") || trimmed.includes(" ")) {
    throw new SsrfError("Invalid domain");
  }
  return trimmed;
}

export function parseAllowedDomains(csv: string): string[] {
  return csv
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map(normalizeDomain);
}

export function hostnameAllowed(hostname: string, allowedDomains: string[]): boolean {
  const host = normalizeHostname(hostname);
  return allowedDomains.some((domain) => {
    const allowed = normalizeDomain(domain);
    return host === allowed || host.endsWith(`.${allowed}`);
  });
}

export async function assertSafeHttpsUrl(
  rawUrl: string,
  allowedDomains: string[],
  lookup: LookupFn = defaultLookup,
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfError("Invalid URL");
  }

  if (parsed.protocol !== "https:") {
    throw new SsrfError("Only https URLs are allowed");
  }

  const hostname = normalizeHostname(parsed.hostname);
  if (isBlockedHostname(hostname)) {
    throw new SsrfError("URL target is not allowed");
  }

  if (allowedDomains.length === 0) {
    throw new SsrfError("No allowed domains configured for this secret");
  }

  if (!hostnameAllowed(hostname, allowedDomains)) {
    throw new SsrfError(`Host ${hostname} is not in the allowlist for this secret`);
  }

  const addresses = isIP(hostname) ? [hostname] : await lookup(hostname);
  for (const address of addresses) {
    if (isPrivateIp(address)) {
      throw new SsrfError("URL target is not allowed");
    }
  }

  return parsed;
}

export async function defaultLookup(hostname: string): Promise<string[]> {
  const records = await dnsLookup(hostname, { all: true });
  return records.map((record) => record.address);
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "").replace(/\.+$/, "");
}

function isBlockedHostname(hostname: string): boolean {
  if (BLOCKED_HOSTS.has(hostname)) {
    return true;
  }
  if (hostname.endsWith(".localhost")) {
    return true;
  }
  return isPrivateIp(hostname);
}

export function isPrivateIp(ip: string): boolean {
  const value = ip.toLowerCase();
  if (value.includes(":")) {
    if (value === "::1" || value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) {
      return true;
    }
    const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (!mapped?.[1]) {
      return false;
    }
    return isPrivateIPv4(mapped[1]);
  }
  return isPrivateIPv4(value);
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  return false;
}
