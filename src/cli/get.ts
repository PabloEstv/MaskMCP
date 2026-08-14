import { select } from "@clack/prompts";
import { LocalVaultManager } from "../core/vault.js";
import { copyToClipboard } from "./clipboard.js";
import { CliError } from "./errors.js";
import { exitIfCancel, requireMasterKey } from "./master-key.js";

export async function runGet(alias: string): Promise<void> {
  const vault = new LocalVaultManager();
  const masterKey = await requireMasterKey();
  const value = await vault.getSecret(alias, masterKey);
  if (value === null) {
    throw new CliError("Secret not found");
  }

  if (!process.stdin.isTTY) {
    console.log(value);
    return;
  }

  const action = exitIfCancel(
    await select({
      message: `Reveal ${alias}`,
      options: [
        { value: "print", label: "Show in terminal" },
        { value: "copy", label: "Copy to clipboard" },
      ],
    }),
  );

  if (action === "copy") {
    const copied = await copyToClipboard(value);
    if (copied) {
      console.log("Copied to clipboard.");
      return;
    }
    console.error("[maskmcp] clipboard unavailable, printing value");
  }

  console.log(value);
}
