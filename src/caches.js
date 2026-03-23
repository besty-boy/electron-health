import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { getSizeBytes } from "./fs-size.js";
import { formatBytes, normalizeName } from "./format.js";

const HOME = os.homedir();

function getSearchDirs({ extended }) {
  const dirs = [
    { base: path.join(HOME, "Library", "Application Support"), label: "App Support" },
    { base: path.join(HOME, "Library", "Caches"), label: "Caches" },
    { base: path.join(HOME, "Library", "Logs"), label: "Logs" },
    { base: path.join(HOME, "Library", "Saved Application State"), label: "Saved State" },
    { base: path.join(HOME, "Library", "WebKit"), label: "WebKit" },
    { base: path.join(HOME, "Library", "HTTPStorages"), label: "HTTP Storage" },
    { base: path.join(HOME, "Library", "Cookies"), label: "Cookies" },
  ];
  if (extended) {
    dirs.push({ base: path.join(HOME, "Library", "Preferences"), label: "Preferences" });
    dirs.push({ base: path.join(HOME, "Library", "Containers"), label: "Containers" });
    dirs.push({ base: path.join(HOME, "Library", "Group Containers"), label: "Group Containers" });
  }
  return dirs;
}

function matchesEntry({ entry, appName, bundleId }) {
  const entryNorm = normalizeName(entry);
  const appNorm = normalizeName(appName);
  const bundleLower = (bundleId ?? "").toLowerCase();
  const entryLower = entry.toLowerCase();
  const matchName = appNorm && entryNorm.includes(appNorm);
  const matchBundle = bundleLower && (entryLower.includes(bundleLower) || bundleLower.includes(entryLower));
  return matchName || matchBundle;
}

export function findCachePaths(app, { extended = false } = {}) {
  const dirs = getSearchDirs({ extended });
  const candidates = [];
  for (const { base, label } of dirs) {
    if (!fs.existsSync(base)) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(base);
    } catch {
      entries = [];
    }
    for (const entry of entries) {
      if (!matchesEntry({ entry, appName: app.name, bundleId: app.bundleId })) continue;
      const fullPath = path.join(base, entry);
      const sizeBytes = getSizeBytes(fullPath);
      candidates.push({
        path: fullPath,
        label,
        sizeBytes,
        size: sizeBytes === null ? "?" : formatBytes(sizeBytes),
      });
    }
  }
  candidates.sort((a, b) => (b.sizeBytes ?? -1) - (a.sizeBytes ?? -1));
  return candidates;
}

export function totalSizeBytes(items) {
  return items.reduce((acc, item) => acc + (item.sizeBytes ?? 0), 0);
}

