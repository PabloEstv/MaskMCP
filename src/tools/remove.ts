import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { LocalVaultManager } from "../core/vault.js";
import { fail, ok, toErrorResult } from "./helpers.js";

export function registerRemoveSecretTool(server: McpServer, vault: LocalVaultManager): void {
  server.tool(
    "mask_remove_secret",
    "Elimina un secreto de la bóveda",
    { alias: z.string().min(1) },
    async ({ alias }) => {
      try {
        const removed = await vault.removeSecret(alias);
        if (!removed) {
          return fail("Secret not found");
        }
        return ok(JSON.stringify({ alias, removed: true }));
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
