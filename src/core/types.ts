export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  salt: string;
}

export interface SecretEntry {
  alias: string;
  encryptedValue: EncryptedData;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, string>;
}

export interface VaultSchema {
  version: string;
  secrets: Record<string, SecretEntry>;
  updatedAt: string;
}

export const VAULT_SCHEMA_VERSION = "1";
