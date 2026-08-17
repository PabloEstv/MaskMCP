import { LocalVaultManager } from "../core/vault.js";
import { formatAliasTable } from "./format.js";

export async function runList(): Promise<void> {
  const vault = new LocalVaultManager();
  const secrets = await vault.listSecrets();
  console.log(formatAliasTable(secrets));
}
