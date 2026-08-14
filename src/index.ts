#!/usr/bin/env node

import { startServer } from "./server.js";

async function main(): Promise<void> {
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

main().catch((error: unknown) => {
  console.error("[maskmcp] failed to start:", error);
  process.exit(1);
});
