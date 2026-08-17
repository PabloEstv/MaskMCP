import { CryptoAuthError } from "../core/crypto.js";
import { SsrfError } from "../core/ssrf.js";

export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

export function formatCliError(error: unknown): string {
  if (error instanceof CliError) {
    return error.message;
  }
  if (error instanceof CryptoAuthError) {
    return "Authentication failed";
  }
  if (error instanceof SsrfError) {
    return error.message;
  }
  return "Operation failed";
}
