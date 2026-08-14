import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveServerEntry(): string {
  return join(findPackageRoot(), "dist", "index.js");
}

function findPackageRoot(start = fileURLToPath(new URL(".", import.meta.url))): string {
  let dir = start;
  while (true) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      const parsed = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
      if (parsed.name === "maskmcp") {
        return dir;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error("Unable to locate maskmcp package root");
    }
    dir = parent;
  }
}
