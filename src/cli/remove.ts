import { confirm } from "@clack/prompts";
import { LocalVaultManager } from "../core/vault.js";
import { CliError } from "./errors.js";
import { exitIfCancel } from "./master-key.js";

export async function runRemove(alias: string, yes = false): Promise<void> {
  const vault = new LocalVaultManager();
  const exists = await vault.hasSecret(alias);
  if (!exists) {
    throw new CliError("Secret not found");
  }

  if (!yes) {
    if (!process.stdin.isTTY) {
      throw new CliError("Pass --yes to remove without confirmation");
    }
    const confirmed = exitIfCancel(
      await confirm({
        message: `Remove ${alias}?`,
        initialValue: false,
      }),
    );
    if (!confirmed) {
      console.log("Cancelled.");
      return;
    }
  }

  const removed = await vault.removeSecret(alias);
  if (!removed) {
    throw new CliError("Secret not found");
  }
  console.log(`Removed ${alias}`);
}
