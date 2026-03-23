import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readPlist, getPlistValue } from "./plist.js";
import { getSizeBytes } from "./fs-size.js";
import { formatBytes } from "./format.js";

const HOME = os.homedir();

function getAppInfoFromPlist(appPath) {
  const plistPath = path.join(appPath, "Contents", "Info.plist");
  const plist = readPlist(plistPath);
  const version = getPlistValue(plist, "CFBundleShortVersionString") ?? "?";
  const bundleId = getPlistValue(plist, "CFBundleIdentifier");
  const executable = getPlistValue(plist, "CFBundleExecutable");
  const executablePath = executable
    ? path.join(appPath, "Contents", "MacOS", executable)
    : null;
  return { version, bundleId, executablePath };
}

function binaryLooksElectron(executablePath) {
  if (!executablePath) return false;
  try {
    const buf = fs.readFileSync(executablePath);
    return buf.includes(Buffer.from("Electron")) || buf.includes(Buffer.from("chromium"));
  } catch {
    return false;
  }
}

export function isElectronApp(appPath) {
  const electronFramework = path.join(
    appPath,
    "Contents",
    "Frameworks",
    "Electron Framework.framework"
  );
  const electronAsar = path.join(appPath, "Contents", "Resources", "electron.asar");
  const appAsar = path.join(appPath, "Contents", "Resources", "app.asar");
  if (fs.existsSync(electronFramework) || fs.existsSync(electronAsar)) return true;
  if (!fs.existsSync(appAsar)) return false;
  const { executablePath } = getAppInfoFromPlist(appPath);
  return binaryLooksElectron(executablePath);
}

export function scanApps({ includeUserApps = true } = {}) {
  const dirs = ["/Applications"];
  if (includeUserApps) dirs.push(path.join(HOME, "Applications"));
  const apps = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      entries = [];
    }
    for (const entry of entries) {
      if (!entry.endsWith(".app")) continue;
      const appPath = path.join(dir, entry);
      if (!isElectronApp(appPath)) continue;
      const name = entry.slice(0, -4);
      const { version, bundleId } = getAppInfoFromPlist(appPath);
      const sizeBytes = getSizeBytes(appPath);
      apps.push({
        name,
        path: appPath,
        version,
        bundleId,
        sizeBytes,
        size: sizeBytes === null ? "?" : formatBytes(sizeBytes),
      });
    }
  }
  apps.sort((a, b) => (b.sizeBytes ?? -1) - (a.sizeBytes ?? -1));
  return apps;
}

