import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { EgressDeps } from "../core/egress.js";
import { LocalVaultManager } from "../core/vault.js";
import { registerFetchTool } from "./fetch.js";
import { registerHasSecretTool } from "./has.js";
import { registerListSecretsTool } from "./list.js";
import { registerPingTool } from "./ping.js";

export function registerTools(
  server: McpServer,
  vault = new LocalVaultManager(),
  deps: EgressDeps = {},
): void {
  registerPingTool(server);
  registerListSecretsTool(server, vault);
  registerHasSecretTool(server, vault);
  registerFetchTool(server, vault, deps);
}
