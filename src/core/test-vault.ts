import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encryptSecret } from "./crypto.js";
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
  const vaultPath = join(dir, "vault.json");
  const vault = new LocalVaultManager(vaultPath);

  try {
    await vault.init();
    await vault.setSecret(ALIAS, VALUE, MASTER_KEY, ["api.stripe.com"]);

    const listed = await vault.listSecrets();
    const stripe = listed.find((entry) => entry.alias === ALIAS);
    if (!stripe || stripe.allowedDomains.join(",") !== "api.stripe.com" || !("updatedAt" in stripe)) {
      throw new Error("listSecrets did not return alias, allowedDomains, updatedAt");
    }
    if ("encryptedValue" in stripe || "createdAt" in stripe) {
      throw new Error("listSecrets leaked extra fields");
    }
    log("listSecrets: ok");

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

    const invalidAliases = ["A", "stripe-key", "stripe_key", "CONSTRUCTOR", "__PROTO__", "prototype"];
    for (const alias of invalidAliases) {
      let rejected = false;
      try {
        await vault.setSecret(alias, VALUE, MASTER_KEY, ["example.com"]);
      } catch {
        rejected = true;
      }
      if (!rejected) {
        throw new Error(`expected invalid alias to be rejected: ${alias}`);
      }
    }
    log("alias validation: ok");

    const encrypted = await encryptSecret(VALUE, MASTER_KEY);
    const now = new Date().toISOString();
    await writeFile(
      vaultPath,
      JSON.stringify({
        version: "1",
        updatedAt: now,
        secrets: {
          OLD_KEY: {
            alias: "OLD_KEY",
            encryptedValue: encrypted,
            createdAt: now,
            updatedAt: now,
          },
        },
      }),
      "utf8",
    );
    const migrated = new LocalVaultManager(vaultPath);
    const oldListed = await migrated.listSecrets();
    const oldEntry = oldListed.find((entry) => entry.alias === "OLD_KEY");
    if (!oldEntry || oldEntry.allowedDomains.length !== 0) {
      throw new Error("v1 migration did not default allowedDomains to []");
    }
    if ((await migrated.getSecret("OLD_KEY", MASTER_KEY)) !== VALUE) {
      throw new Error("v1 nested ciphertext did not decrypt");
    }
    const persisted = JSON.parse(await readFile(vaultPath, "utf8")) as { version: string };
    log(`v1 migration: ok (on-disk version ${persisted.version} until next write)`);
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
