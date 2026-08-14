import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LocalVaultManager } from "../core/vault.js";
import { ok, toErrorResult } from "./helpers.js";

export function registerListSecretsTool(server: McpServer, vault: LocalVaultManager): void {
  server.tool(
    "mask_list_secrets",
    "Lista los alias de secretos en la bóveda (sin valores)",
    async () => {
      try {
        const aliases = await vault.listAliases();
        return ok(JSON.stringify(aliases));
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
