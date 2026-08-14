export type { EncryptedData, SecretEntry, VaultSchema } from "./types.js";
export { VAULT_SCHEMA_VERSION } from "./types.js";
export {
  CryptoAuthError,
  decryptSecret,
  encryptSecret,
  generateRandomToken,
} from "./crypto.js";
export { LocalVaultManager } from "./vault.js";
