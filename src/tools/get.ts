import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { LocalVaultManager } from "../core/vault.js";
import { fail, ok, resolveMasterKey, toErrorResult } from "./helpers.js";

export function registerGetSecretTool(server: McpServer, vault: LocalVaultManager): void {
  server.tool(
    "mask_get_secret",
    "Descifra y devuelve un secreto de la bóveda",
    {
      alias: z.string().min(1),
      masterKey: z.string().optional(),
    },
    async ({ alias, masterKey }) => {
      const key = resolveMasterKey(masterKey);
      if (!key) {
        return fail("Missing master key");
      }
      try {
        const value = await vault.getSecret(alias, key);
        if (value === null) {
          return fail("Secret not found");
        }
        return ok(value);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}
