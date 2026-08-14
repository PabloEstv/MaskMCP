import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { APP_NAME, APP_VERSION } from "../config.js";
import { LocalVaultManager } from "../core/vault.js";
import { registerTools } from "./index.js";

const ALIAS = "STRIPE_KEY";
const VALUE = "sk_test_123456789";
const MASTER_KEY = "correct-master-key";

function log(message: string): void {
  console.error(message);
}

function asToolResult(result: unknown): {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
} {
  if (!result || typeof result !== "object" || !("content" in result) || !Array.isArray(result.content)) {
    throw new Error("Unexpected tool result shape");
  }
  const isError = "isError" in result ? Boolean(result.isError) : false;
  return { content: result.content as Array<{ type: string; text?: string }>, isError };
}

function textOf(result: unknown): string {
  const normalized = asToolResult(result);
  const block = normalized.content.find((item) => item.type === "text");
  return block && typeof block.text === "string" ? block.text : "";
}

function assertOk(result: unknown, step: string): void {
  if (asToolResult(result).isError) {
    throw new Error(`${step} returned isError`);
  }
}

async function main(): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "maskmcp-tools-"));
  const vault = new LocalVaultManager(join(dir, "vault.json"));
  const server = new McpServer({ name: APP_NAME, version: APP_VERSION });
  registerTools(server, vault);

  const client = new Client({ name: "maskmcp-test", version: APP_VERSION });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    const setResult = await client.callTool({
      name: "mask_set_secret",
      arguments: { alias: ALIAS, value: VALUE, masterKey: MASTER_KEY },
    });
    assertOk(setResult, "mask_set_secret");
    log("mask_set_secret: ok");

    const listResult = await client.callTool({ name: "mask_list_secrets", arguments: {} });
    assertOk(listResult, "mask_list_secrets");
    const listed = JSON.parse(textOf(listResult)) as Array<{ alias: string }>;
    if (!listed.some((entry) => entry.alias === ALIAS)) {
      throw new Error("mask_list_secrets did not include the stored alias");
    }
    log("mask_list_secrets: ok");

    const getResult = await client.callTool({
      name: "mask_get_secret",
      arguments: { alias: ALIAS, masterKey: MASTER_KEY },
    });
    assertOk(getResult, "mask_get_secret");
    if (textOf(getResult) !== VALUE) {
      throw new Error("mask_get_secret value does not match original");
    }
    log("mask_get_secret: ok");

    const templateResult = await client.callTool({
      name: "mask_export_template",
      arguments: { format: "env" },
    });
    assertOk(templateResult, "mask_export_template");
    if (textOf(templateResult) !== `${ALIAS}=mask:${ALIAS}`) {
      throw new Error("mask_export_template output mismatch");
    }
    log("mask_export_template: ok");

    const removeResult = await client.callTool({
      name: "mask_remove_secret",
      arguments: { alias: ALIAS },
    });
    assertOk(removeResult, "mask_remove_secret");
    const hasResult = await client.callTool({
      name: "mask_has_secret",
      arguments: { alias: ALIAS },
    });
    assertOk(hasResult, "mask_has_secret");
    const has = JSON.parse(textOf(hasResult)) as { exists: boolean };
    if (has.exists) {
      throw new Error("mask_remove_secret did not delete the alias");
    }
    log("mask_remove_secret: ok");
    log("test:tools passed");
  } finally {
    await client.close().catch(() => undefined);
    await server.close().catch(() => undefined);
    await rm(dir, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(`[maskmcp] test:tools failed: ${message}`);
  process.exit(1);
});
