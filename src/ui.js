import chalk from "chalk";
import path from "node:path";
import { formatBytes } from "./format.js";
import { totalSizeBytes } from "./caches.js";

export function printHeader() {
  console.log("");
  console.log(
    chalk.bold.white("  ⚡ electron-health") + chalk.dim("  —  Désencombrez votre Mac des apps Electron")
  );
  console.log(chalk.dim("  ─────────────────────────────────────────────"));
  console.log("");
}

export function printGlobalSummary(apps) {
  const totalBytes = apps.reduce((acc, a) => acc + (a.sizeBytes ?? 0), 0);
  console.log(
    chalk.dim("  Espace occupé par les apps Electron : ") + chalk.bold.yellow(formatBytes(totalBytes))
  );
}

export function printAppCard(app, alts) {
  const bar = chalk.dim("│");
  console.log(
    `\n${chalk.bold.yellow("  ●")} ${chalk.bold.white(app.name)} ${chalk.dim(`v${app.version}`)}  ${chalk.dim("·")}  ${chalk.cyan(app.size)}`
  );
  if (alts) {
    console.log(`  ${bar} ${chalk.dim("raison:")} ${chalk.red(alts.reason)}`);
    console.log(`  ${bar} ${chalk.dim("alternatives:")}`);
    for (const a of alts.alternatives) {
      console.log(`  ${bar}   ${chalk.green("→")} ${chalk.bold(a.name)}  ${chalk.dim(a.type)}`);
    }
  } else {
    console.log(`  ${bar} ${chalk.dim("app Electron détectée")}`);
  }
}

export function printCacheSummary(cachePaths) {
  if (cachePaths.length === 0) {
    console.log(chalk.dim("    Aucun cache trouvé."));
    return;
  }
  const total = totalSizeBytes(cachePaths);
  console.log(
    chalk.dim(`    ${cachePaths.length} entrée(s) trouvée(s) — `) + chalk.yellow(`${formatBytes(total)} récupérables`)
  );
  for (const c of cachePaths) {
    console.log(chalk.dim(`    · ${c.label}: ${path.basename(c.path)} (${c.size})`));
  }
}

export function printAlternatives(alts) {
  if (!alts) {
    console.log(chalk.dim("\n  Pas d'alternative répertoriée pour cette app.\n"));
    return;
  }
  console.log(chalk.bold.cyan("\n  Alternatives recommandées :\n"));
  for (const a of alts.alternatives) {
    console.log(`  ${chalk.green("→")} ${chalk.bold(a.name)}  ${a.type}`);
    if (a.url !== "system" && a.url !== "xcode") console.log(chalk.dim(`     ${a.url}`));
  }
  console.log("");
}

