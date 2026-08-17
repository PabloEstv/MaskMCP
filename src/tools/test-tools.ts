import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { APP_NAME, APP_VERSION } from "../config.js";
import { REDACTED_SECRET } from "../core/redact.js";
import { LocalVaultManager } from "../core/vault.js";
import { registerTools } from "./index.js";

const ALIAS = "STRIPE_KEY";
const VALUE = "sk_test/123+secret=";
const MASTER_KEY = "correct-master-key";
const ALLOWED = "api.stripe.com";

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

function assertError(result: unknown, step: string, includes?: string): void {
  if (!asToolResult(result).isError) {
    throw new Error(`${step} expected isError`);
  }
  const text = textOf(result);
  if (text.includes(VALUE) || text.includes(encodeURIComponent(VALUE))) {
    throw new Error(`${step} leaked secret`);
  }
  if (includes && !text.includes(includes)) {
    throw new Error(`${step} missing expected message`);
  }
}

async function main(): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "maskmcp-tools-"));
  const vault = new LocalVaultManager(join(dir, "vault.json"));
  await vault.setSecret(ALIAS, VALUE, MASTER_KEY, [ALLOWED]);
  process.env.MASKMCP_MASTER_KEY = MASTER_KEY;

  let fetchCalls = 0;
  const mockFetch: typeof fetch = async (input) => {
    fetchCalls += 1;
    const url = String(input);
    if (url.includes("redirect")) {
      return new Response(null, {
        status: 302,
        statusText: "Found",
        headers: { Location: "https://evil.example/steal" },
      });
    }
    if (url.includes("fail-network")) {
      throw new Error(`connect failed for ${url}`);
    }
    return new Response(
      JSON.stringify({
        token: VALUE,
        encoded: encodeURIComponent(VALUE),
      }),
      {
        status: 200,
        statusText: "OK",
        headers: {
          "content-type": "application/json",
          "x-echo": VALUE,
        },
      },
    );
  };

  const server = new McpServer({ name: APP_NAME, version: APP_VERSION });
  registerTools(server, vault, {
    fetch: mockFetch,
    lookup: async () => ["93.184.216.34"],
  });

  const client = new Client({ name: "maskmcp-test", version: APP_VERSION });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  try {
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    const ping = await client.callTool({ name: "mask_ping", arguments: {} });
    if (textOf(ping) !== "pong") {
      throw new Error("mask_ping failed");
    }
    log("mask_ping: ok");

    const listResult = await client.callTool({ name: "mask_list_secrets", arguments: {} });
    const listed = JSON.parse(textOf(listResult)) as Array<{ alias: string; allowedDomains: string[] }>;
    if (!listed.some((entry) => entry.alias === ALIAS && entry.allowedDomains.includes(ALLOWED))) {
      throw new Error("mask_list_secrets mismatch");
    }
    log("mask_list_secrets: ok");

    const hasResult = await client.callTool({
      name: "mask_has_secret",
      arguments: { alias: ALIAS },
    });
    const has = JSON.parse(textOf(hasResult)) as { exists: boolean };
    if (!has.exists) {
      throw new Error("mask_has_secret expected true");
    }
    log("mask_has_secret: ok");

    const listedTools = await client.listTools();
    const names = new Set(listedTools.tools.map((tool) => tool.name));
    for (const name of ["mask_get_secret", "mask_set_secret", "mask_remove_secret", "mask_export_template"]) {
      if (names.has(name)) {
        throw new Error(`${name} should not exist`);
      }
    }
    if (!names.has("mask_fetch") || !names.has("mask_ping")) {
      throw new Error("expected mask_fetch and mask_ping");
    }
    log("removed MCP secret tools: ok");

    const httpResult = await client.callTool({
      name: "mask_fetch",
      arguments: { alias: ALIAS, url: "http://api.stripe.com/v1" },
    });
    assertError(httpResult, "http", "https");
    log("reject http: ok");

    const ssrfResult = await client.callTool({
      name: "mask_fetch",
      arguments: { alias: ALIAS, url: "https://127.0.0.1/secret" },
    });
    assertError(ssrfResult, "ssrf");
    log("reject SSRF: ok");

    const domainResult = await client.callTool({
      name: "mask_fetch",
      arguments: { alias: ALIAS, url: "https://evil.example/v1" },
    });
    assertError(domainResult, "allowlist", "allowlist");
    log("reject unauthorized domain: ok");

    fetchCalls = 0;
    const redirectResult = await client.callTool({
      name: "mask_fetch",
      arguments: { alias: ALIAS, url: `https://${ALLOWED}/redirect` },
    });
    const redirectBody = JSON.parse(textOf(redirectResult)) as { status: number };
    if (redirectBody.status !== 302 || fetchCalls !== 1) {
      throw new Error("redirect was followed or status mismatch");
    }
    log("redirect not followed: ok");

    const echoResult = await client.callTool({
      name: "mask_fetch",
      arguments: { alias: ALIAS, url: `https://${ALLOWED}/echo` },
    });
    const echoText = textOf(echoResult);
    if (echoText.includes(VALUE) || echoText.includes(encodeURIComponent(VALUE))) {
      throw new Error("reflected secret was not redacted");
    }
    if (!echoText.includes(REDACTED_SECRET)) {
      throw new Error("expected [REDACTED_SECRET]");
    }
    log("redaction: ok");

    const failResult = await client.callTool({
      name: "mask_fetch",
      arguments: {
        alias: ALIAS,
        url: `https://${ALLOWED}/fail-network`,
        authType: "Query",
      },
    });
    assertError(failResult, "network-error");
    log("safe network error: ok");
    log("test:tools passed");
  } finally {
    delete process.env.MASKMCP_MASTER_KEY;
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
