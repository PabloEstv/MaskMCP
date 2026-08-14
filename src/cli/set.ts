import { LocalVaultManager } from "../core/vault.js";
import { requireHiddenValue, requireMasterKey } from "./master-key.js";

export async function runSet(alias: string, value?: string): Promise<void> {
  const vault = new LocalVaultManager();
  const secret = value && value.length > 0 ? value : await requireHiddenValue("Secret value");
  const masterKey = await requireMasterKey();
  await vault.setSecret(alias, secret, masterKey);
  console.log(`Stored ${alias}`);
}
