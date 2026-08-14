import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
} from "node:crypto";
import type { EncryptedData } from "./types.js";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const SALT_BYTES = 16;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 } as const;

export class CryptoAuthError extends Error {
  constructor(message = "Authentication failed") {
    super(message);
    this.name = "CryptoAuthError";
  }
}

export async function encryptSecret(
  plainText: string,
  masterKey: string,
): Promise<EncryptedData> {
  assertNonEmpty(masterKey);

  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveKey(masterKey, salt);

  try {
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString("hex"),
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
      salt: salt.toString("hex"),
    };
  } finally {
    key.fill(0);
  }
}

export async function decryptSecret(
  encrypted: EncryptedData,
  masterKey: string,
): Promise<string> {
  assertNonEmpty(masterKey);

  const salt = parseHex(encrypted.salt, SALT_BYTES);
  const iv = parseHex(encrypted.iv, IV_BYTES);
  const tag = parseHex(encrypted.tag, TAG_BYTES);
  const ciphertext = parseHex(encrypted.ciphertext);
  const key = await deriveKey(masterKey, salt);

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plain.toString("utf8");
  } catch (error) {
    if (error instanceof CryptoAuthError) {
      throw error;
    }
    throw new CryptoAuthError();
  } finally {
    key.fill(0);
  }
}

export function generateRandomToken(bytes = 32): string {
  if (!Number.isInteger(bytes) || bytes < 1) {
    throw new Error("Token size must be a positive integer");
  }
  return randomBytes(bytes).toString("hex");
}

async function deriveKey(masterKey: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(masterKey, salt, KEY_BYTES, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) {
        reject(new Error("Key derivation failed"));
        return;
      }
      resolve(derivedKey);
    });
  });
}

function parseHex(value: string, expectedBytes?: number): Buffer {
  if (typeof value !== "string" || !/^[0-9a-fA-F]+$/.test(value) || value.length % 2 !== 0) {
    throw new CryptoAuthError();
  }
  if (expectedBytes !== undefined && value.length !== expectedBytes * 2) {
    throw new CryptoAuthError();
  }
  return Buffer.from(value, "hex");
}

function assertNonEmpty(value: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Invalid credentials");
  }
}
