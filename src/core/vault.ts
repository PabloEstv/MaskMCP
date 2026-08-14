import { randomUUID } from "node:crypto";
import { access, chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DATA_DIR_MODE, VAULT_FILE_MODE, VAULT_PATH } from "../config.js";
import { decryptSecret, encryptSecret } from "./crypto.js";
import type { EncryptedData, SecretEntry, VaultSchema } from "./types.js";
import { VAULT_SCHEMA_VERSION } from "./types.js";

export class LocalVaultManager {
  private readonly vaultPath: string;
  private readonly dataDir: string;
  private initPromise: Promise<void> | null = null;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(vaultPath = VAULT_PATH) {
    this.vaultPath = vaultPath;
    this.dataDir = dirname(vaultPath);
  }

  async init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.doInit();
    }
    await this.initPromise;
  }

  async setSecret(
    alias: string,
    value: string,
    masterKey: string,
    metadata?: Record<string, string>,
  ): Promise<void> {
    assertAlias(alias);
    await this.withLock(async () => {
      const vault = await this.readVault();
      const now = new Date().toISOString();
      const existing = vault.secrets[alias];
      const encryptedValue = await encryptSecret(value, masterKey);
      const entry: SecretEntry = {
        alias,
        encryptedValue,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      if (metadata) {
        entry.metadata = metadata;
      }
      vault.secrets[alias] = entry;
      vault.updatedAt = now;
      await this.writeVault(vault);
    });
  }

  async getSecret(alias: string, masterKey: string): Promise<string | null> {
    assertAlias(alias);
    const vault = await this.readVault();
    const entry = vault.secrets[alias];
    if (!entry) {
      return null;
    }
    return decryptSecret(entry.encryptedValue, masterKey);
  }

  async listAliases(): Promise<Array<{ alias: string; createdAt: string; updatedAt: string }>> {
    const vault = await this.readVault();
    return Object.values(vault.secrets).map(({ alias, createdAt, updatedAt }) => ({
      alias,
      createdAt,
      updatedAt,
    }));
  }

  async removeSecret(alias: string): Promise<boolean> {
    assertAlias(alias);
    return this.withLock(async () => {
      const vault = await this.readVault();
      if (!(alias in vault.secrets)) {
        return false;
      }
      delete vault.secrets[alias];
      vault.updatedAt = new Date().toISOString();
      await this.writeVault(vault);
      return true;
    });
  }

  async hasSecret(alias: string): Promise<boolean> {
    assertAlias(alias);
    const vault = await this.readVault();
    return alias in vault.secrets;
  }

  private async doInit(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true, mode: DATA_DIR_MODE });
    await chmod(this.dataDir, DATA_DIR_MODE);
    try {
      await access(this.vaultPath);
    } catch {
      await this.writeVault(emptyVault());
    }
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.init();
    const run = this.writeChain.then(fn, fn);
    this.writeChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async readVault(): Promise<VaultSchema> {
    await this.init();
    let raw: string;
    try {
      raw = await readFile(this.vaultPath, "utf8");
    } catch {
      throw new Error("Unable to read vault");
    }
    return parseVault(raw);
  }

  private async writeVault(vault: VaultSchema): Promise<void> {
    const tmpPath = join(this.dataDir, `.vault.${randomUUID()}.tmp`);
    try {
      await writeFile(tmpPath, JSON.stringify(vault, null, 2), {
        encoding: "utf8",
        mode: VAULT_FILE_MODE,
      });
      await rename(tmpPath, this.vaultPath);
      await chmod(this.vaultPath, VAULT_FILE_MODE);
    } catch {
      await unlink(tmpPath).catch(() => undefined);
      throw new Error("Unable to persist vault");
    }
  }
}

function emptyVault(): VaultSchema {
  return {
    version: VAULT_SCHEMA_VERSION,
    secrets: {},
    updatedAt: new Date().toISOString(),
  };
}

function assertAlias(alias: string): void {
  if (typeof alias !== "string" || alias.length === 0) {
    throw new Error("Invalid alias");
  }
}

function parseVault(raw: string): VaultSchema {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Vault file is corrupted");
  }

  if (!isRecord(parsed) || parsed.version !== VAULT_SCHEMA_VERSION || !isRecord(parsed.secrets)) {
    throw new Error("Vault file is corrupted");
  }
  if (typeof parsed.updatedAt !== "string") {
    throw new Error("Vault file is corrupted");
  }

  const secrets: Record<string, SecretEntry> = {};
  for (const [key, value] of Object.entries(parsed.secrets)) {
    const entry = parseSecretEntry(key, value);
    secrets[key] = entry;
  }

  return {
    version: VAULT_SCHEMA_VERSION,
    secrets,
    updatedAt: parsed.updatedAt,
  };
}

function parseSecretEntry(key: string, value: unknown): SecretEntry {
  if (!isRecord(value) || value.alias !== key) {
    throw new Error("Vault file is corrupted");
  }
  if (typeof value.createdAt !== "string" || typeof value.updatedAt !== "string") {
    throw new Error("Vault file is corrupted");
  }
  if (!isEncryptedData(value.encryptedValue)) {
    throw new Error("Vault file is corrupted");
  }

  const entry: SecretEntry = {
    alias: key,
    encryptedValue: value.encryptedValue,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };

  if (value.metadata !== undefined) {
    if (!isStringRecord(value.metadata)) {
      throw new Error("Vault file is corrupted");
    }
    entry.metadata = value.metadata;
  }

  return entry;
}

function isEncryptedData(value: unknown): value is EncryptedData {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.ciphertext === "string" &&
    typeof value.iv === "string" &&
    typeof value.tag === "string" &&
    typeof value.salt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) {
    return false;
  }
  return Object.values(value).every((item) => typeof item === "string");
}
