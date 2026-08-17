import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { confirm, password } from "@clack/prompts";
import { CliError } from "./errors.js";
import { exitIfCancel } from "./master-key.js";

export type SetupCursorOptions = {
  print?: boolean;
  write?: boolean;
  masterKey?: string;
};

type McpConfigFile = {
  mcpServers?: Record<string, unknown>;
};

export async function runSetupCursor(options: SetupCursorOptions): Promise<void> {
  const masterKey = await resolveOptionalMasterKey(options);
  const snippet = buildMcpSnippet(masterKey);
  console.log(JSON.stringify({ mcpServers: { maskmcp: printableSnippet(snippet) } }, null, 2));

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
  await ensureGitignoreIgnoresMcpJson();
  console.error("[maskmcp] updated ./.cursor/mcp.json");
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

function buildMcpSnippet(masterKey?: string): Record<string, unknown> {
  const snippet: Record<string, unknown> = {
    command: "npx",
    args: ["-y", "@pablo_estv/maskmcp"],
  };
  if (masterKey) {
    snippet.env = { MASKMCP_MASTER_KEY: masterKey };
  }
  return snippet;
}

function printableSnippet(snippet: Record<string, unknown>): Record<string, unknown> {
  const env = snippet.env;
  if (!env || typeof env !== "object") {
    return snippet;
  }
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(env as Record<string, unknown>)) {
    redacted[key] = key === "MASKMCP_MASTER_KEY" ? "[REDACTED]" : String(value);
  }
  return { ...snippet, env: redacted };
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

async function ensureGitignoreIgnoresMcpJson(): Promise<void> {
  const gitignorePath = join(process.cwd(), ".gitignore");
  let raw: string;
  try {
    raw = await readFile(gitignorePath, "utf8");
  } catch (error) {
    if (isNotFound(error)) {
      return;
    }
    throw new CliError("Unable to update .gitignore");
  }

  const lines = raw.split(/\r?\n/).map((line) => line.trim());
  if (lines.includes(".cursor/mcp.json")) {
    return;
  }
  const suffix = raw.length === 0 || raw.endsWith("\n") ? "" : "\n";
  await writeFile(gitignorePath, `${raw}${suffix}.cursor/mcp.json\n`);
  console.error("[maskmcp] added .cursor/mcp.json to .gitignore");
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
