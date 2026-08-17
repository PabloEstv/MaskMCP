import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LocalVaultManager } from "../core/vault.js";
import { ok, toErrorResult } from "./helpers.js";

export function registerListSecretsTool(server: McpServer, vault: LocalVaultManager): void {
  server.tool(
    "mask_list_secrets",
    "Lista alias y dominios permitidos (sin valores)",
    async () => {
      try {
        const secrets = await vault.listSecrets();
        return ok(JSON.stringify(secrets));
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
