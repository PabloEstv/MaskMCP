import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { LocalVaultManager } from "../core/vault.js";
import { fail, ok, resolveMasterKey, toErrorResult } from "./helpers.js";

export function registerSetSecretTool(server: McpServer, vault: LocalVaultManager): void {
  server.tool(
    "mask_set_secret",
    "Cifra y guarda un secreto en la bóveda",
    {
      alias: z.string().min(1),
      value: z.string().min(1),
      masterKey: z.string().optional(),
      metadata: z.record(z.string(), z.string()).optional(),
    },
    async ({ alias, value, masterKey, metadata }) => {
      const key = resolveMasterKey(masterKey);
      if (!key) {
        return fail("Missing master key");
      }
      try {
        await vault.setSecret(alias, value, key, metadata);
        return ok(JSON.stringify({ alias, stored: true }));
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
