import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { confirm, password } from "@clack/prompts";
import { CliError } from "./errors.js";
import { exitIfCancel } from "./master-key.js";
import { resolveServerEntry } from "./paths.js";

export type SetupCursorOptions = {
  print?: boolean;
  write?: boolean;
  masterKey?: string;
};

type McpConfigFile = {
  mcpServers?: Record<string, unknown>;
};

export async function runSetupCursor(options: SetupCursorOptions): Promise<void> {
  const serverEntry = resolveServerEntry();
  const masterKey = await resolveOptionalMasterKey(options);
  const snippet = buildMcpSnippet(serverEntry, masterKey);
  const json = JSON.stringify({ mcpServers: { maskmcp: snippet } }, null, 2);

  console.log(json);

  if (options.print && !options.write) {
    return;
  }

  const shouldWrite = options.write
    ? true
    : process.stdin.isTTY
      ? exitIfCancel(
          await confirm({
            message: "Write ./.cursor/mcp.json in the current directory?",
            initialValue: true,
          }),
        )
      : false;

  if (!shouldWrite) {
    return;
  }

  await writeProjectMcpConfig(snippet);
  console.log("Updated ./.cursor/mcp.json");
}

async function resolveOptionalMasterKey(options: SetupCursorOptions): Promise<string | undefined> {
  if (options.masterKey?.trim()) {
    return options.masterKey.trim();
  }
  const fromEnv = process.env.MASKMCP_MASTER_KEY?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (options.print || options.write || !process.stdin.isTTY) {
    return undefined;
  }
  const include = exitIfCancel(
    await confirm({
      message: "Include MASKMCP_MASTER_KEY in Cursor env?",
      initialValue: false,
    }),
  );
  if (!include) {
    return undefined;
  }
  const entered = exitIfCancel(
    await password({
      message: "Master key for Cursor env",
      mask: "*",
      validate: (value) => (value ? undefined : "Master key is required"),
    }),
  );
  return entered;
}

function buildMcpSnippet(serverEntry: string, masterKey?: string): Record<string, unknown> {
  const snippet: Record<string, unknown> = {
    command: "node",
    args: [serverEntry],
  };
  if (masterKey) {
    snippet.env = { MASKMCP_MASTER_KEY: masterKey };
  }
  return snippet;
}

async function writeProjectMcpConfig(snippet: Record<string, unknown>): Promise<void> {
  const dir = join(process.cwd(), ".cursor");
  const file = join(dir, "mcp.json");
  await mkdir(dir, { recursive: true });

  let parsed: McpConfigFile = {};
  try {
    parsed = JSON.parse(await readFile(file, "utf8")) as McpConfigFile;
  } catch (error) {
    if (!isNotFound(error)) {
      throw new CliError("Unable to read .cursor/mcp.json");
    }
  }

  const next: McpConfigFile = {
    ...parsed,
    mcpServers: {
      ...(parsed.mcpServers ?? {}),
      maskmcp: snippet,
    },
  };

  const mode = snippet.env ? 0o600 : 0o644;
  await writeFile(file, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode });
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
