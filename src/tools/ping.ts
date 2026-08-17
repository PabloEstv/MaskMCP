import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerPingTool(server: McpServer): void {
  server.tool("mask_ping", "Comprueba que el servidor MCP está vivo", async () => ({
    content: [{ type: "text", text: "pong" }],
  }));
}
