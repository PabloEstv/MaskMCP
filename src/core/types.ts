export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  salt: string;
}

export interface SecretEntry {
  alias: string;
  encryptedValue: string;
  iv: string;
  tag: string;
  salt: string;
  allowedDomains: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VaultSchema {
  version: string;
  secrets: Record<string, SecretEntry>;
  updatedAt: string;
}

export const VAULT_SCHEMA_VERSION = "2";
export const LEGACY_VAULT_SCHEMA_VERSION = "1";
export const ALIAS_PATTERN = /^[A-Z0-9_]{2,64}$/;
export const RESERVED_ALIASES = new Set(["__proto__", "constructor", "prototype"]);
