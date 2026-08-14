import { homedir } from "node:os";
import { join } from "node:path";

export const APP_NAME = "maskmcp";
export const APP_VERSION = "1.0.0";

export const DATA_DIR = join(homedir(), ".maskmcp");
export const DATA_DIR_MODE = 0o700;
export const VAULT_PATH = join(DATA_DIR, "vault.json");
export const VAULT_FILE_MODE = 0o600;
