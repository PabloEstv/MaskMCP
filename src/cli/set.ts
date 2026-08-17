import { text } from "@clack/prompts";
import { parseAllowedDomains } from "../core/ssrf.js";
import { LocalVaultManager } from "../core/vault.js";
import { CliError } from "./errors.js";
import { exitIfCancel, requireHiddenValue, requireMasterKey } from "./master-key.js";

export async function runSet(
  alias: string,
  value?: string,
  domainsCsv?: string,
): Promise<void> {
  const vault = new LocalVaultManager();
  const secret = value && value.length > 0 ? value : await requireHiddenValue("Secret value");
  const masterKey = await requireMasterKey();
  const allowedDomains = await resolveDomains(domainsCsv);
  await vault.setSecret(alias, secret, masterKey, allowedDomains);
  console.log(`Stored ${alias}`);
}

async function resolveDomains(domainsCsv?: string): Promise<string[]> {
  if (domainsCsv && domainsCsv.trim().length > 0) {
    return parseAllowedDomains(domainsCsv);
  }
  if (!process.stdin.isTTY) {
    throw new CliError("Missing allowed domains");
  }
  const entered = exitIfCancel(
    await text({
      message: "Dominios permitidos (ej. api.openai.com, separadas por coma):",
      validate: (value) => (value && value.trim().length > 0 ? undefined : "At least one domain is required"),
    }),
  );
  return parseAllowedDomains(entered);
}
