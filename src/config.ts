import { homedir } from "node:os";
import { join } from "node:path";

export const APP_NAME = "maskmcp";
export const APP_VERSION = "0.1.0";

export const DATA_DIR = join(homedir(), ".maskmcp");
export const VAULT_PATH = join(DATA_DIR, "vault.json");
