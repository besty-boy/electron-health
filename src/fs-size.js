import { execFileSync } from "node:child_process";

export function getSizeBytes(targetPath) {
  try {
    const out = execFileSync("du", ["-sk", targetPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const kb = Number.parseInt(out.split("\t")[0], 10);
    if (!Number.isFinite(kb) || kb < 0) return null;
    return kb * 1024;
  } catch {
    return null;
  }
}

