import { confirm, intro, outro } from "@clack/prompts";
import { LocalVaultManager } from "../core/vault.js";
import { VAULT_PATH } from "../config.js";
import { exitIfCancel } from "./master-key.js";
import { runSetupCursor } from "./setup-cursor.js";

export async function runInit(): Promise<void> {
  intro("maskmcp");
  const vault = new LocalVaultManager();
  await vault.init();
  console.log(`Vault ready: ${VAULT_PATH}`);

  if (!process.stdin.isTTY) {
    outro("Done.");
    return;
  }

  const configure = exitIfCancel(
    await confirm({
      message: "Configure Cursor now? (writes MASKMCP_MASTER_KEY only into mcp.json env)",
      initialValue: true,
    }),
  );

  if (configure) {
    await runSetupCursor({});
    return;
  }

  outro("Run maskmcp setup-cursor when you are ready.");
}
