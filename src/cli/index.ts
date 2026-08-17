#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { APP_NAME, APP_VERSION } from "../config.js";
import { formatCliError } from "./errors.js";
import { runGet } from "./get.js";
import { runInit } from "./init.js";
import { runList } from "./list.js";
import { runRemove } from "./remove.js";
import { runSet } from "./set.js";
import { runSetupCursor } from "./setup-cursor.js";

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();
  program
    .name(APP_NAME)
    .description("CLI local-first para la bóveda de secretos y la config de Cursor")
    .version(APP_VERSION);

  program.command("init").description("Inicializa ~/.maskmcp y opcionalmente configura Cursor").action(async () => {
    await runInit();
  });

  program
    .command("set")
    .description("Registra o actualiza un secreto")
    .argument("<alias>", "Identificador del secreto")
    .argument("[value]", "Valor (si se omite, se pide oculto)")
    .option("--domains <list>", "Dominios permitidos separados por coma")
    .action(async (alias: string, value: string | undefined, options: { domains?: string }) => {
      await runSet(alias, value, options.domains);
    });

  program
    .command("get")
    .description("Descifra un secreto")
    .argument("<alias>", "Identificador del secreto")
    .action(async (alias: string) => {
      await runGet(alias);
    });

  program.command("list").description("Lista alias, dominios permitidos y fechas").action(async () => {
    await runList();
  });

  program
    .command("remove")
    .description("Elimina un secreto")
    .argument("<alias>", "Identificador del secreto")
    .option("-y, --yes", "Confirmar sin prompt")
    .action(async (alias: string, options: { yes?: boolean }) => {
      await runRemove(alias, Boolean(options.yes));
    });

  program
    .command("setup-cursor")
    .description("Genera el JSON para .cursor/mcp.json")
    .option("--print", "Solo imprime el JSON")
    .option("--write", "Escribe ./.cursor/mcp.json sin prompt")
    .option("--master-key <key>", "Incluye MASKMCP_MASTER_KEY en env")
    .action(async (options: { print?: boolean; write?: boolean; masterKey?: string }) => {
      await runSetupCursor({
        print: Boolean(options.print),
        write: Boolean(options.write),
        masterKey: options.masterKey,
      });
    });

  try {
    await program.parseAsync(argv, { from: "user" });
  } catch (error) {
    console.error(`[maskmcp] ${formatCliError(error)}`);
    process.exitCode = 1;
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return fileURLToPath(import.meta.url) === resolve(entry);
}

if (isMainModule()) {
  void runCli(process.argv.slice(2));
}
