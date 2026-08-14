import { CryptoAuthError } from "../core/crypto.js";

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

export function resolveMasterKey(provided?: string): string | undefined {
  const fromArg = provided?.trim();
  if (fromArg) {
    return fromArg;
  }
  const fromEnv = process.env.MASKMCP_MASTER_KEY?.trim();
  return fromEnv ? fromEnv : undefined;
}

export function ok(text: string): ToolResult {
  return { content: [{ type: "text", text }] };
}

export function fail(text: string): ToolResult {
  return { isError: true, content: [{ type: "text", text }] };
}

export function toErrorResult(error: unknown): ToolResult {
  if (error instanceof CryptoAuthError) {
    return fail("Authentication failed");
  }
  return fail("Operation failed");
}
