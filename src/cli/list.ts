import { LocalVaultManager } from "../core/vault.js";
import { formatAliasTable } from "./format.js";

export async function runList(): Promise<void> {
  const vault = new LocalVaultManager();
  const aliases = await vault.listAliases();
  console.log(formatAliasTable(aliases));
}
