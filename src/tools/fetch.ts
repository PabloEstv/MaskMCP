import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { confidentialFetch, type EgressDeps } from "../core/egress.js";
import { redactSecret } from "../core/redact.js";
import { SsrfError } from "../core/ssrf.js";
import type { LocalVaultManager } from "../core/vault.js";
import { fail, ok, resolveMasterKey, toErrorResult } from "./helpers.js";

export function registerFetchTool(
  server: McpServer,
  vault: LocalVaultManager,
  deps: EgressDeps = {},
): void {
  server.tool(
    "mask_fetch",
    "Llama a un HTTPS permitido inyectando el secreto sin devolverlo al modelo",
    {
      alias: z.string().min(1),
      url: z.string().min(1),
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
      headers: z.record(z.string(), z.string()).optional(),
      body: z.unknown().optional(),
      authType: z.enum(["Bearer", "Header", "Query"]).default("Bearer"),
      headerName: z.string().optional(),
      queryParamName: z.string().optional(),
    },
    async ({ alias, url, method, headers, body, authType, headerName, queryParamName }) => {
      const masterKey = resolveMasterKey();
      if (!masterKey) {
        return fail("Missing master key");
      }

      let secret: string | null = null;
      try {
        const entry = await vault.getEntry(alias);
        if (!entry) {
          return fail("Secret not found");
        }
        secret = await vault.getSecret(alias, masterKey);
        if (secret === null) {
          return fail("Secret not found");
        }

        const result = await confidentialFetch({
          url,
          method,
          headers,
          body,
          authType,
          headerName,
          queryParamName,
          secret,
          allowedDomains: entry.allowedDomains,
        }, deps);
        return ok(JSON.stringify(result));
      } catch (error) {
        if (error instanceof SsrfError) {
          return fail(error.message);
        }
        if (secret) {
          const message = error instanceof Error ? error.message : "Request failed";
          return fail(redactSecret(message, secret));
        }
        return toErrorResult(error);
      }
    },
  );
}
