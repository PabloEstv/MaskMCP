import { cancel, isCancel, password } from "@clack/prompts";
import { resolveMasterKey } from "../tools/helpers.js";
import { CliError } from "./errors.js";

export function exitIfCancel<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Cancelled.");
    process.exit(0);
  }
  return value;
}

export async function requireMasterKey(): Promise<string> {
  const fromEnv = resolveMasterKey();
  if (fromEnv) {
    return fromEnv;
  }
  if (!process.stdin.isTTY) {
    throw new CliError("Missing master key");
  }
  const entered = exitIfCancel(
    await password({
      message: "Master key",
      mask: "*",
      validate: (value) => (value ? undefined : "Master key is required"),
    }),
  );
  return entered;
}

export async function requireHiddenValue(message: string): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new CliError("Missing value");
  }
  const entered = exitIfCancel(
    await password({
      message,
      mask: "*",
      validate: (value) => (value ? undefined : "Value is required"),
    }),
  );
  return entered;
}
