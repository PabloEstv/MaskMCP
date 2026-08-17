import { randomUUID } from "node:crypto";
import { access, chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DATA_DIR_MODE, VAULT_FILE_MODE, VAULT_PATH } from "../config.js";
import { decryptSecret, encryptSecret } from "./crypto.js";
import { normalizeDomain } from "./ssrf.js";
import type { EncryptedData, SecretEntry, VaultSchema } from "./types.js";
import {
  ALIAS_PATTERN,
  LEGACY_VAULT_SCHEMA_VERSION,
  RESERVED_ALIASES,
  VAULT_SCHEMA_VERSION,
} from "./types.js";

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
    allowedDomains: string[] = [],
  ): Promise<void> {
    assertAlias(alias);
    const domains = allowedDomains.map(normalizeDomain);
    await this.withLock(async () => {
      const vault = await this.readVault();
      const now = new Date().toISOString();
      const existing = vault.secrets[alias];
      const encrypted = await encryptSecret(value, masterKey);
      vault.secrets[alias] = {
        alias,
        encryptedValue: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag,
        salt: encrypted.salt,
        allowedDomains: domains,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      vault.updatedAt = now;
      await this.writeVault(vault);
    });
  }

  async getSecret(alias: string, masterKey: string): Promise<string | null> {
    assertAlias(alias);
    const vault = await this.readVault();
    const entry = Object.hasOwn(vault.secrets, alias) ? vault.secrets[alias] : undefined;
    if (!entry) {
      return null;
    }
    return decryptSecret(toEncryptedData(entry), masterKey);
  }

  async getEntry(alias: string): Promise<SecretEntry | null> {
    assertAlias(alias);
    const vault = await this.readVault();
    return Object.hasOwn(vault.secrets, alias) ? vault.secrets[alias] : null;
  }

  async listSecrets(): Promise<Array<{ alias: string; allowedDomains: string[]; updatedAt: string }>> {
    const vault = await this.readVault();
    return Object.values(vault.secrets).map(({ alias, allowedDomains, updatedAt }) => ({
      alias,
      allowedDomains,
      updatedAt,
    }));
  }

  async listAliases(): Promise<Array<{ alias: string; allowedDomains: string[]; updatedAt: string }>> {
    return this.listSecrets();
  }

  async removeSecret(alias: string): Promise<boolean> {
    assertAlias(alias);
    return this.withLock(async () => {
      const vault = await this.readVault();
      if (!Object.hasOwn(vault.secrets, alias)) {
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
    return Object.hasOwn(vault.secrets, alias);
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

export function assertAlias(alias: string): void {
  if (typeof alias !== "string" || !ALIAS_PATTERN.test(alias)) {
    throw new Error("Invalid alias");
  }
  if (RESERVED_ALIASES.has(alias.toLowerCase())) {
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

  if (!isRecord(parsed) || !isRecord(parsed.secrets) || typeof parsed.updatedAt !== "string") {
    throw new Error("Vault file is corrupted");
  }
  if (parsed.version !== VAULT_SCHEMA_VERSION && parsed.version !== LEGACY_VAULT_SCHEMA_VERSION) {
    throw new Error("Vault file is corrupted");
  }

  const secrets: Record<string, SecretEntry> = {};
  for (const [key, value] of Object.entries(parsed.secrets)) {
    secrets[key] = parseSecretEntry(key, value);
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

  const cryptoFields = extractCryptoFields(value);
  let allowedDomains: string[] = [];
  if (Array.isArray(value.allowedDomains)) {
    allowedDomains = value.allowedDomains.flatMap((item) => {
      if (typeof item !== "string") {
        return [];
      }
      try {
        return [normalizeDomain(item)];
      } catch {
        return [];
      }
    });
  }

  return {
    alias: key,
    encryptedValue: cryptoFields.ciphertext,
    iv: cryptoFields.iv,
    tag: cryptoFields.tag,
    salt: cryptoFields.salt,
    allowedDomains,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function extractCryptoFields(value: Record<string, unknown>): EncryptedData {
  if (typeof value.encryptedValue === "string") {
    if (
      typeof value.iv !== "string" ||
      typeof value.tag !== "string" ||
      typeof value.salt !== "string"
    ) {
      throw new Error("Vault file is corrupted");
    }
    return {
      ciphertext: value.encryptedValue,
      iv: value.iv,
      tag: value.tag,
      salt: value.salt,
    };
  }
  if (isEncryptedData(value.encryptedValue)) {
    return value.encryptedValue;
  }
  throw new Error("Vault file is corrupted");
}

function toEncryptedData(entry: SecretEntry): EncryptedData {
  return {
    ciphertext: entry.encryptedValue,
    iv: entry.iv,
    tag: entry.tag,
    salt: entry.salt,
  };
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
