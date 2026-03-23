import fs from "node:fs";
import { execFileSync } from "node:child_process";

export function readPlist(plistPath) {
  try {
    if (!fs.existsSync(plistPath)) return null;
    const raw = execFileSync("plutil", ["-convert", "json", "-o", "-", plistPath], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getPlistValue(plist, key) {
  if (!plist || typeof plist !== "object") return null;
  const value = plist[key];
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

