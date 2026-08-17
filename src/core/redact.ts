export const REDACTED_SECRET = "[REDACTED_SECRET]";

export function redactSecret(text: string, secret: string): string {
  if (!secret || secret.length === 0) {
    return text;
  }

  let output = replaceAll(text, secret, REDACTED_SECRET);
  const encoded = encodeURIComponent(secret);
  if (encoded !== secret) {
    output = replaceAll(output, encoded, REDACTED_SECRET);
  }
  return output;
}

export function redactDeep(value: unknown, secret: string): unknown {
  if (typeof value === "string") {
    return redactSecret(value, secret);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactDeep(item, secret));
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = redactDeep(item, secret);
    }
    return result;
  }
  return value;
}

function replaceAll(haystack: string, needle: string, replacement: string): string {
  return haystack.split(needle).join(replacement);
}
