import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LocalVaultManager } from "../core/vault.js";
import { registerExportTemplateTool } from "./template.js";
import { registerGetSecretTool } from "./get.js";
import { registerHasSecretTool } from "./has.js";
import { registerListSecretsTool } from "./list.js";
import { registerPingTool } from "./ping.js";
import { registerRemoveSecretTool } from "./remove.js";
import { registerSetSecretTool } from "./set.js";

export function registerTools(
  server: McpServer,
  vault = new LocalVaultManager(),
): void {
  registerPingTool(server);
  registerListSecretsTool(server, vault);
  registerHasSecretTool(server, vault);
  registerSetSecretTool(server, vault);
  registerGetSecretTool(server, vault);
  registerRemoveSecretTool(server, vault);
  registerExportTemplateTool(server, vault);
}
