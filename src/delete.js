import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const HOME = os.homedir();

function escapeAppleScriptString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

function isUnder(parent, child) {
  const rel = path.relative(parent, child);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function assertSafeDelete(targetPath, kind) {
  if (!path.isAbsolute(targetPath)) throw new Error("Chemin non absolu");
  const normalized = path.normalize(targetPath);
  const forbidden = ["/", HOME, path.join(HOME, "Library"), "/Applications"];
  if (forbidden.includes(normalized)) throw new Error("Chemin interdit");
  if (kind === "app") {
    if (!normalized.endsWith(".app")) throw new Error("Cible non .app");
    if (!(isUnder("/Applications", normalized) || isUnder(path.join(HOME, "Applications"), normalized))) {
      throw new Error("App en dehors de /Applications");
    }
    return;
  }
  if (kind === "cache") {
    if (!isUnder(path.join(HOME, "Library"), normalized)) throw new Error("Cache en dehors de ~/Library");
    return;
  }
  throw new Error("Type inconnu");
}

function moveToTrash(targetPath) {
  const safe = escapeAppleScriptString(targetPath);
  const script = `tell application "Finder" to delete POSIX file "${safe}"`;
  execFileSync("osascript", ["-e", script], { stdio: ["ignore", "ignore", "ignore"] });
}

function deletePermanently(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

export function deletePath(targetPath, { kind, force, dryRun }) {
  assertSafeDelete(targetPath, kind);
  if (dryRun) return { mode: force ? "force" : "trash", ok: true };
  if (force) {
    deletePermanently(targetPath);
    return { mode: "force", ok: true };
  }
  moveToTrash(targetPath);
  return { mode: "trash", ok: true };
}

