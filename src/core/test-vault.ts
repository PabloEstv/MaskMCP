import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CryptoAuthError } from "./crypto.js";
import { LocalVaultManager } from "./vault.js";

const ALIAS = "STRIPE_KEY";
const VALUE = "sk_test_123456789";
const MASTER_KEY = "correct-master-key";
const WRONG_KEY = "incorrect-master-key";

function log(message: string): void {
  console.error(message);
}

async function main(): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "maskmcp-test-"));
  const vault = new LocalVaultManager(join(dir, "vault.json"));

  try {
    await vault.init();
    await vault.setSecret(ALIAS, VALUE, MASTER_KEY);

    const aliases = await vault.listAliases();
    if (!aliases.some((entry) => entry.alias === ALIAS)) {
      throw new Error("listAliases did not include the stored alias");
    }
    log("listAliases: ok");

    const decrypted = await vault.getSecret(ALIAS, MASTER_KEY);
    if (decrypted !== VALUE) {
      throw new Error("decrypted value does not match original");
    }
    log("decrypt matches: true");

    let authFailed = false;
    try {
      await vault.getSecret(ALIAS, WRONG_KEY);
    } catch (error) {
      if (error instanceof CryptoAuthError) {
        authFailed = true;
      } else {
        throw error;
      }
    }
    if (!authFailed) {
      throw new Error("expected CryptoAuthError for incorrect master key");
    }
    log("wrong master key: CryptoAuthError");
    log("test:vault passed");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(`[maskmcp] test:vault failed: ${message}`);
  process.exit(1);
});
