#!/usr/bin/env node

import { runCli } from "./cli/index.js";
import { startServer } from "./server.js";

async function startMcpServer(): Promise<void> {
  const server = await startServer();

  const shutdown = async (signal: string): Promise<void> => {
    console.error(`[maskmcp] received ${signal}, shutting down`);
    try {
      await server.close();
    } catch (error) {
      console.error("[maskmcp] error during shutdown:", error);
    }
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "serve") {
    await startMcpServer();
    return;
  }
  await runCli(args);
}

main().catch((error: unknown) => {
  console.error("[maskmcp] failed to start:", error);
  process.exit(1);
});
