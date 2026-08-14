import { spawn } from "node:child_process";
import { platform } from "node:os";

export async function copyToClipboard(text: string): Promise<boolean> {
  const os = platform();
  if (os === "darwin") {
    return spawnCopy("pbcopy", [], text);
  }
  if (os === "win32") {
    return spawnCopy("clip", [], text);
  }
  if (await spawnCopy("wl-copy", [], text)) {
    return true;
  }
  return spawnCopy("xclip", ["-selection", "clipboard"], text);
}

function spawnCopy(command: string, args: string[], text: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ["pipe", "ignore", "ignore"] });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
    child.stdin.write(text);
    child.stdin.end();
  });
}
