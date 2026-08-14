import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { LocalVaultManager } from "../core/vault.js";
import { ok, toErrorResult } from "./helpers.js";

export function registerHasSecretTool(server: McpServer, vault: LocalVaultManager): void {
  server.tool(
    "mask_has_secret",
    "Comprueba si un alias existe en la bóveda",
    { alias: z.string().min(1) },
    async ({ alias }) => {
      try {
        const exists = await vault.hasSecret(alias);
        return ok(JSON.stringify({ exists }));
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
