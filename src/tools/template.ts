import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { LocalVaultManager } from "../core/vault.js";
import { ok, toErrorResult } from "./helpers.js";

export function registerExportTemplateTool(server: McpServer, vault: LocalVaultManager): void {
  server.tool(
    "mask_export_template",
    "Genera una plantilla de variables a partir de los alias de la bóveda",
    { format: z.enum(["env", "json"]).default("env") },
    async ({ format }) => {
      try {
        const aliases = await vault.listAliases();
        if (format === "json") {
          const template = Object.fromEntries(
            aliases.map(({ alias }) => [alias, `mask:${alias}`]),
          );
          return ok(JSON.stringify(template));
        }
        const lines = aliases.map(({ alias }) => `${alias}=mask:${alias}`);
        return ok(lines.join("\n"));
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
