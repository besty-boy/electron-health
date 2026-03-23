import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import path from "node:path";
import fs from "node:fs";
import { parseArgs } from "node:util";
import { ALTERNATIVES } from "./alternatives.js";
import { scanApps } from "./scan.js";
import { findCachePaths } from "./caches.js";
import { deletePath } from "./delete.js";
import { printHeader, printGlobalSummary, printAppCard, printCacheSummary, printAlternatives } from "./ui.js";
import { normalizeName, formatBytes } from "./format.js";

function readPackageVersion() {
  try {
    const pkgPath = new URL("../package.json", import.meta.url);
    const raw = fs.readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw);
    return String(pkg.version ?? "0.0.0");
  } catch {
    return "0.0.0";
  }
}

function usage() {
  return [
    "electron-health — détecte, nettoie et remplace les apps Electron sur macOS",
    "",
    "Usage:",
    "  electron-health",
    "  electron-health --list [--json] [--only-known] [--exclude <pattern>...] [--extended]",
    "  electron-health --action <all|cache|alts|skip> (--all | --app <name>...) [options]",
    "",
    "Options:",
    "  --list                 Liste les apps Electron détectées et sort",
    "  --json                 Sortie JSON (utile avec --list ou --action)",
    "  --dry-run              N'écrit rien (prévisualisation)",
    "  --yes, -y              Pas de confirmations",
    "  --action <mode>        all, cache, alts, skip",
    "  --all                  Sélectionne toutes les apps après filtres",
    "  --app <name>           Sélection par nom (répétable)",
    "  --only-known           Garde uniquement les apps avec alternatives connues",
    "  --exclude <pattern>    Exclut par sous-chaîne (répétable)",
    "  --extended             Ajoute Preferences/Containers/Group Containers aux caches",
    "  --force                Suppression définitive (sinon Corbeille)",
    "  --version, -v          Affiche la version",
    "  --help, -h             Aide",
    "",
    "Exemples:",
    "  electron-health --list",
    "  electron-health --list --json",
    "  electron-health --action cache --all --dry-run",
    "  electron-health --action all --app Slack --yes",
  ].join("\n");
}

function parseCli(argv) {
  const { values } = parseArgs({
    args: argv,
    allowPositionals: false,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      list: { type: "boolean" },
      json: { type: "boolean" },
      "dry-run": { type: "boolean" },
      yes: { type: "boolean", short: "y" },
      action: { type: "string" },
      all: { type: "boolean" },
      app: { type: "string", multiple: true },
      "only-known": { type: "boolean" },
      exclude: { type: "string", multiple: true },
      extended: { type: "boolean" },
      force: { type: "boolean" },
    },
  });

  const action = values.action ?? null;
  const selectedApps = values.app ?? [];
  const exclude = values.exclude ?? [];

  return {
    help: Boolean(values.help),
    version: Boolean(values.version),
    list: Boolean(values.list),
    json: Boolean(values.json),
    dryRun: Boolean(values["dry-run"]),
    yes: Boolean(values.yes),
    action,
    all: Boolean(values.all),
    app: selectedApps,
    onlyKnown: Boolean(values["only-known"]),
    exclude,
    extended: Boolean(values.extended),
    force: Boolean(values.force),
  };
}

function applyFilters(apps, { onlyKnown, exclude }) {
  const excludeNorm = exclude.map((p) => normalizeName(p)).filter(Boolean);
  return apps.filter((app) => {
    if (onlyKnown && !ALTERNATIVES[app.name]) return false;
    if (excludeNorm.length > 0) {
      const n = normalizeName(app.name);
      if (excludeNorm.some((p) => n.includes(p))) return false;
    }
    return true;
  });
}

function resolveSelection(apps, { all, appNames }) {
  if (all) return apps;
  if (!appNames || appNames.length === 0) return [];
  const wanted = appNames.map((x) => normalizeName(x)).filter(Boolean);
  const selected = [];
  for (const a of apps) {
    const n = normalizeName(a.name);
    if (wanted.some((w) => n.includes(w))) selected.push(a);
  }
  const unique = new Map(selected.map((a) => [a.path, a]));
  return Array.from(unique.values());
}

function toJsonApp(app) {
  return {
    name: app.name,
    path: app.path,
    version: app.version,
    bundleId: app.bundleId,
    sizeBytes: app.sizeBytes,
  };
}

function requireAction(mode) {
  const allowed = new Set(["all", "cache", "alts", "skip"]);
  if (!mode || !allowed.has(mode)) throw new Error("Action invalide");
  return mode;
}

async function runList({ json, onlyKnown, exclude, extended }) {
  const apps = applyFilters(scanApps(), { onlyKnown, exclude });
  if (json) {
    process.stdout.write(
      JSON.stringify(
        {
          apps: apps.map((a) => ({ ...toJsonApp(a), hasAlternatives: Boolean(ALTERNATIVES[a.name]) })),
          cacheScope: extended ? "extended" : "standard",
        },
        null,
        2
      ) + "\n"
    );
    return;
  }

  printHeader();
  console.log(chalk.dim(`  ${apps.length} app(s) Electron détectée(s)`));
  if (apps.length === 0) return;
  printGlobalSummary(apps);
  console.log("");
  for (const app of apps) {
    const alts = ALTERNATIVES[app.name];
    const badge = alts ? chalk.green("connue") : chalk.dim("inconnue");
    console.log(`  ${chalk.bold(app.name)} ${chalk.dim(`v${app.version} · ${app.size}`)} ${chalk.dim("·")} ${badge}`);
  }
  console.log("");
}

async function runNonInteractive({
  action,
  json,
  dryRun,
  yes,
  onlyKnown,
  exclude,
  extended,
  force,
  all,
  app,
}) {
  const mode = requireAction(action);
  const apps = applyFilters(scanApps(), { onlyKnown, exclude });
  const selected = resolveSelection(apps, { all, appNames: app });
  if (selected.length === 0) throw new Error("Aucune app sélectionnée");

  const results = [];
  for (const item of selected) {
    const alts = ALTERNATIVES[item.name];
    const cachePaths = findCachePaths(item, { extended });
    const planned = { mode, force, dryRun, yes };
    if (mode === "skip") {
      results.push({ app: toJsonApp(item), planned, ok: true, skipped: true });
      continue;
    }
    if (mode === "alts") {
      results.push({
        app: toJsonApp(item),
        planned,
        ok: true,
        alternatives: alts ?? null,
      });
      continue;
    }
    if (mode === "cache") {
      const cacheOps = [];
      for (const c of cachePaths) {
        let op;
        try {
          op = deletePath(c.path, { kind: "cache", force, dryRun });
        } catch (e) {
          op = { mode: force ? "force" : "trash", ok: false, error: e.message };
        }
        cacheOps.push({ path: c.path, label: c.label, ...op });
      }
      results.push({
        app: toJsonApp(item),
        planned,
        ok: cacheOps.every((x) => x.ok),
        caches: cacheOps,
      });
      continue;
    }
    if (mode === "all") {
      let appOp;
      try {
        appOp = deletePath(item.path, { kind: "app", force, dryRun });
      } catch (e) {
        appOp = { mode: force ? "force" : "trash", ok: false, error: e.message };
      }
      const cacheOps = [];
      for (const c of cachePaths) {
        let op;
        try {
          op = deletePath(c.path, { kind: "cache", force, dryRun });
        } catch (e) {
          op = { mode: force ? "force" : "trash", ok: false, error: e.message };
        }
        cacheOps.push({ path: c.path, label: c.label, ...op });
      }
      results.push({
        app: toJsonApp(item),
        planned,
        ok: appOp.ok && cacheOps.every((x) => x.ok),
        deleteApp: { path: item.path, ...appOp },
        caches: cacheOps,
      });
    }
  }

  if (json) {
    process.stdout.write(JSON.stringify({ results }, null, 2) + "\n");
    return;
  }

  printHeader();
  const modeLabel = force ? chalk.red("suppression définitive") : chalk.yellow("Corbeille");
  const preview = dryRun ? chalk.dim(" (dry-run)") : "";
  console.log(chalk.dim(`  Mode: ${modeLabel}${preview}`));
  console.log("");

  for (const r of results) {
    const title = chalk.bold.white(r.app.name);
    if (r.planned.mode === "skip") {
      console.log(`  ${title}: ${chalk.dim("ignoré")}`);
      continue;
    }
    if (r.planned.mode === "alts") {
      console.log(`  ${title}:`);
      printAlternatives(ALTERNATIVES[r.app.name]);
      continue;
    }
    if (r.planned.mode === "cache") {
      const count = r.caches?.length ?? 0;
      console.log(`  ${title}: ${chalk.dim(`${count} cache(s)`)}`);
      continue;
    }
    if (r.planned.mode === "all") {
      const count = r.caches?.length ?? 0;
      console.log(`  ${title}: ${chalk.dim(`app + ${count} cache(s)`)}`);
    }
  }
  console.log("");
}

async function scanWithSpinner() {
  const spinner = ora("Scan des apps Electron…").start();
  await new Promise((r) => setTimeout(r, 200));
  const apps = scanApps();
  spinner.succeed(`${chalk.bold(apps.length)} app(s) Electron détectée(s)`);
  return apps;
}

async function pause(message = "Entrée pour continuer") {
  await inquirer.prompt([{ type: "input", name: "continue", message }]);
}

function settingsLabel(settings) {
  const items = [];
  items.push(settings.force ? chalk.red("force") : chalk.yellow("corbeille"));
  if (settings.dryRun) items.push(chalk.dim("dry-run"));
  if (settings.extended) items.push(chalk.dim("extended"));
  if (settings.onlyKnown) items.push(chalk.dim("only-known"));
  if (settings.exclude.length > 0) items.push(chalk.dim(`exclude:${settings.exclude.join(",")}`));
  return items.join(chalk.dim(" · "));
}

async function editSettings(settings) {
  while (true) {
    printHeader();
    console.log(chalk.dim(`  Paramètres: ${settingsLabel(settings)}`));
    console.log("");
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "  Modifier :",
        choices: [
          { name: `${settings.dryRun ? "✅" : "⬜️"} dry-run`, value: "dryRun" },
          { name: `${settings.force ? "✅" : "⬜️"} --force (suppression définitive)`, value: "force" },
          { name: `${settings.extended ? "✅" : "⬜️"} --extended (caches étendus)`, value: "extended" },
          { name: `${settings.onlyKnown ? "✅" : "⬜️"} --only-known`, value: "onlyKnown" },
          { name: `✏️  --exclude (${settings.exclude.length > 0 ? settings.exclude.join(", ") : "aucun"})`, value: "exclude" },
          { name: "↩︎  Retour", value: "back" },
        ],
      },
    ]);

    if (action === "back") return;
    if (action === "dryRun") settings.dryRun = !settings.dryRun;
    if (action === "force") settings.force = !settings.force;
    if (action === "extended") settings.extended = !settings.extended;
    if (action === "onlyKnown") settings.onlyKnown = !settings.onlyKnown;
    if (action === "exclude") {
      const { value } = await inquirer.prompt([
        {
          type: "input",
          name: "value",
          message: "  Patterns à exclure (séparés par des virgules) :",
          default: settings.exclude.join(","),
        },
      ]);
      const parts = String(value ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      settings.exclude = parts;
    }
  }
}

async function chooseApp(apps) {
  const { app } = await inquirer.prompt([
    {
      type: "list",
      name: "app",
      message: "  Choisissez une app :",
      choices: apps.map((a) => ({
        name: `${chalk.bold(a.name)} ${chalk.dim(`v${a.version} · ${a.size}`)}`,
        value: a,
      })),
      pageSize: 20,
    },
  ]);
  return app;
}

async function runGuidedScan(settings) {
  printHeader();

  const appsRaw = await scanWithSpinner();
  const apps = applyFilters(appsRaw, { onlyKnown: settings.onlyKnown, exclude: settings.exclude });

  if (apps.length === 0) {
    console.log(chalk.green("\n  ✓ Aucune app Electron — votre Mac est propre !\n"));
    return;
  }

  console.log("");
  printGlobalSummary(apps);
  console.log("");

  const { selectedApps } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedApps",
      message: chalk.bold("Sélectionnez les apps à traiter :"),
      choices: apps.map((a) => {
        const alts = ALTERNATIVES[a.name];
        return {
          name:
            `${chalk.bold(a.name)} ${chalk.dim(`v${a.version} · ${a.size}`)}` +
            (alts ? chalk.red(` — ${alts.reason}`) : ""),
          value: a,
          checked: false,
        };
      }),
      pageSize: 20,
    },
  ]);

  if (selectedApps.length === 0) {
    console.log(chalk.dim("\n  Aucune app sélectionnée.\n"));
    return;
  }

  for (const app of selectedApps) {
    const alts = ALTERNATIVES[app.name];
    printAppCard(app, alts);

    const cacheSpinner = ora("  Recherche des caches…").start();
    const cachePaths = findCachePaths(app, { extended: settings.extended });
    cacheSpinner.stop();
    printCacheSummary(cachePaths);

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: `  Que faire avec ${chalk.bold(app.name)} ?`,
        choices: [
          {
            name: `${chalk.red("🗑  Supprimer l'app + tous les caches")} ${chalk.dim(`(${app.size})`)}`,
            value: "all",
          },
          ...(cachePaths.length > 0
            ? [
                {
                  name: `${chalk.yellow("🧹 Supprimer uniquement les caches")} ${chalk.dim(`(${formatBytes(cachePaths.reduce((acc, c) => acc + (c.sizeBytes ?? 0), 0))})`)}`,
                  value: "cache",
                },
              ]
            : []),
          { name: `${chalk.cyan("📋 Voir les alternatives")}`, value: "alts" },
          { name: chalk.dim("⏭  Ignorer"), value: "skip" },
        ],
      },
    ]);

    if (action === "skip") continue;
    if (action === "alts") {
      printAlternatives(alts);
      continue;
    }

    const modeLabel = settings.force ? "suppression définitive" : "Corbeille";
    const preview = settings.dryRun ? " (dry-run)" : "";

    if (action === "all") {
      const prompt = `  Confirmer ${modeLabel}${preview} de ${app.name} + ${cachePaths.length} cache(s) ?`;
      const confirm = await confirmAction(prompt, { defaultValue: false, autoYes: false });
      if (!confirm) continue;
      await runDeleteAppAndCaches(app, cachePaths, { dryRun: settings.dryRun, force: settings.force });
      continue;
    }

    if (action === "cache") {
      const prompt = `  Confirmer ${modeLabel}${preview} de ${cachePaths.length} cache(s) ?`;
      const confirm = await confirmAction(prompt, { defaultValue: true, autoYes: false });
      if (!confirm) continue;
      await runDeleteCaches(cachePaths, { dryRun: settings.dryRun, force: settings.force });
    }
  }

  console.log("\n" + chalk.bold.green("  ✓ Terminé !") + chalk.dim(" Redémarrez votre Mac pour libérer la mémoire.\n"));
}

async function runOneAppAction(settings, mode) {
  printHeader();
  const appsRaw = await scanWithSpinner();
  const apps = applyFilters(appsRaw, { onlyKnown: settings.onlyKnown, exclude: settings.exclude });
  if (apps.length === 0) {
    console.log(chalk.green("\n  ✓ Aucune app Electron.\n"));
    return;
  }

  const app = await chooseApp(apps);
  const alts = ALTERNATIVES[app.name];
  printAppCard(app, alts);

  const cacheSpinner = ora("  Recherche des caches…").start();
  const cachePaths = findCachePaths(app, { extended: settings.extended });
  cacheSpinner.stop();
  printCacheSummary(cachePaths);

  if (mode === "alts") {
    printAlternatives(alts);
    await pause();
    return;
  }

  const modeLabel = settings.force ? "suppression définitive" : "Corbeille";
  const preview = settings.dryRun ? " (dry-run)" : "";

  if (mode === "cache") {
    if (cachePaths.length === 0) {
      console.log(chalk.dim("\n  Aucun cache à traiter.\n"));
      await pause();
      return;
    }
    const prompt = `  Confirmer ${modeLabel}${preview} de ${cachePaths.length} cache(s) ?`;
    const confirm = await confirmAction(prompt, { defaultValue: true, autoYes: false });
    if (!confirm) return;
    await runDeleteCaches(cachePaths, { dryRun: settings.dryRun, force: settings.force });
    await pause();
    return;
  }

  if (mode === "all") {
    const prompt = `  Confirmer ${modeLabel}${preview} de ${app.name} + ${cachePaths.length} cache(s) ?`;
    const confirm = await confirmAction(prompt, { defaultValue: false, autoYes: false });
    if (!confirm) return;
    await runDeleteAppAndCaches(app, cachePaths, { dryRun: settings.dryRun, force: settings.force });
    await pause();
  }
}

async function runInteractiveMenu() {
  const settings = { dryRun: false, force: false, extended: false, onlyKnown: false, exclude: [] };
  while (true) {
    printHeader();
    console.log(chalk.dim(`  ${settingsLabel(settings)}`));
    console.log("");
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "  Que veux-tu faire ?",
        choices: [
          { name: "🔎 Scan + assistant (recommandé)", value: "guided" },
          { name: "📄 Lister les apps Electron", value: "list" },
          { name: "📄 Lister les apps Electron (JSON)", value: "listJson" },
          { name: "📋 Voir les alternatives d'une app", value: "alts" },
          { name: "🧹 Nettoyer les caches d'une app", value: "cache" },
          { name: "🗑 Supprimer une app + caches", value: "all" },
          { name: "⚙️  Paramètres", value: "settings" },
          { name: "❓ Aide / commandes", value: "help" },
          { name: "Quitter", value: "quit" },
        ],
      },
    ]);

    if (action === "quit") return;
    if (action === "help") {
      printHeader();
      process.stdout.write(usage() + "\n\n");
      await pause();
      continue;
    }
    if (action === "settings") {
      await editSettings(settings);
      continue;
    }
    if (action === "guided") {
      await runGuidedScan(settings);
      await pause();
      continue;
    }
    if (action === "list") {
      await runList({ json: false, onlyKnown: settings.onlyKnown, exclude: settings.exclude, extended: settings.extended });
      await pause();
      continue;
    }
    if (action === "listJson") {
      await runList({ json: true, onlyKnown: settings.onlyKnown, exclude: settings.exclude, extended: settings.extended });
      await pause();
      continue;
    }
    if (action === "alts") {
      await runOneAppAction(settings, "alts");
      continue;
    }
    if (action === "cache") {
      await runOneAppAction(settings, "cache");
      continue;
    }
    if (action === "all") {
      await runOneAppAction(settings, "all");
      continue;
    }
  }
}

async function runInteractive({ dryRun, extended, force, onlyKnown, exclude, json, yes }) {
  if (json) throw new Error("--json est prévu pour --list ou --action (non-interactif)");
  const settings = {
    dryRun: Boolean(dryRun),
    extended: Boolean(extended),
    force: Boolean(force),
    onlyKnown: Boolean(onlyKnown),
    exclude: Array.isArray(exclude) ? exclude : [],
  };
  if (process.argv.slice(2).length === 0) {
    await runInteractiveMenu();
    return;
  }
  printHeader();

  const appsRaw = await scanWithSpinner();
  const apps = applyFilters(appsRaw, { onlyKnown: settings.onlyKnown, exclude: settings.exclude });

  if (apps.length === 0) {
    console.log(chalk.green("\n  ✓ Aucune app Electron — votre Mac est propre !\n"));
    process.exit(0);
  }

  console.log("");
  printGlobalSummary(apps);
  console.log("");

  const { selectedApps } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedApps",
      message: chalk.bold("Sélectionnez les apps à traiter :"),
      choices: apps.map((a) => {
        const alts = ALTERNATIVES[a.name];
        return {
          name:
            `${chalk.bold(a.name)} ${chalk.dim(`v${a.version} · ${a.size}`)}` +
            (alts ? chalk.red(` — ${alts.reason}`) : ""),
          value: a,
          checked: false,
        };
      }),
      pageSize: 20,
    },
  ]);

  if (selectedApps.length === 0) {
    console.log(chalk.dim("\n  Aucune app sélectionnée. À bientôt !\n"));
    process.exit(0);
  }

  for (const app of selectedApps) {
    const alts = ALTERNATIVES[app.name];
    printAppCard(app, alts);

    const cacheSpinner = ora("  Recherche des caches…").start();
    const cachePaths = findCachePaths(app, { extended: settings.extended });
    cacheSpinner.stop();
    printCacheSummary(cachePaths);

    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: `  Que faire avec ${chalk.bold(app.name)} ?`,
        choices: [
          {
            name: `${chalk.red("🗑  Supprimer l'app + tous les caches")} ${chalk.dim(`(${app.size})`)}`,
            value: "all",
          },
          ...(cachePaths.length > 0
            ? [
                {
                  name: `${chalk.yellow("🧹 Supprimer uniquement les caches")} ${chalk.dim(`(${formatBytes(cachePaths.reduce((acc, c) => acc + (c.sizeBytes ?? 0), 0))})`)}`,
                  value: "cache",
                },
              ]
            : []),
          { name: `${chalk.cyan("📋 Voir les alternatives")}`, value: "alts" },
          { name: chalk.dim("⏭  Ignorer"), value: "skip" },
        ],
      },
    ]);

    if (action === "skip") continue;
    if (action === "alts") {
      printAlternatives(alts);
      continue;
    }

    const modeLabel = settings.force ? "suppression définitive" : "Corbeille";
    const preview = settings.dryRun ? " (dry-run)" : "";

    if (action === "all") {
      const prompt = `  Confirmer ${modeLabel}${preview} de ${app.name} + ${cachePaths.length} cache(s) ?`;
      const confirm = await confirmAction(prompt, { defaultValue: false, autoYes: yes });
      if (!confirm) continue;
      await runDeleteAppAndCaches(app, cachePaths, { dryRun: settings.dryRun, force: settings.force });
      continue;
    }

    if (action === "cache") {
      const prompt = `  Confirmer ${modeLabel}${preview} de ${cachePaths.length} cache(s) ?`;
      const confirm = await confirmAction(prompt, { defaultValue: true, autoYes: yes });
      if (!confirm) continue;
      await runDeleteCaches(cachePaths, { dryRun: settings.dryRun, force: settings.force });
    }
  }

  console.log("\n" + chalk.bold.green("  ✓ Terminé !") + chalk.dim(" Redémarrez votre Mac pour libérer la mémoire.\n"));
}

async function confirmAction(message, { defaultValue, autoYes }) {
  if (autoYes) return true;
  const { confirm } = await inquirer.prompt([{ type: "confirm", name: "confirm", message, default: defaultValue }]);
  return Boolean(confirm);
}

async function runDeleteAppAndCaches(app, cachePaths, { dryRun, force }) {
  const spinner = ora(`  ${force ? "Suppression" : "Corbeille"} de ${app.name}…`).start();
  try {
    deletePath(app.path, { kind: "app", force, dryRun });
    spinner.succeed(chalk.green(`  ${app.name} ${dryRun ? "prévu" : "traité"} (${app.size})`));
  } catch (e) {
    spinner.fail(chalk.red(`  Erreur: ${e.message}`));
  }
  if (cachePaths.length > 0) await runDeleteCaches(cachePaths, { dryRun, force });
}

async function runDeleteCaches(cachePaths, { dryRun, force }) {
  for (const c of cachePaths) {
    const spinner = ora(`  ${c.label}: ${path.basename(c.path)}…`).start();
    try {
      deletePath(c.path, { kind: "cache", force, dryRun });
      spinner.succeed(chalk.dim(`  ✓ ${c.label} (${c.size})`));
    } catch (e) {
      spinner.fail(chalk.dim(`  ✗ ${c.label} — ${e.message}`));
    }
  }
}

export async function run() {
  try {
    const args = parseCli(process.argv.slice(2));
    if (args.help) {
      process.stdout.write(usage() + "\n");
      process.exit(0);
    }
    if (args.version) {
      process.stdout.write(readPackageVersion() + "\n");
      process.exit(0);
    }
    if (args.list) {
      await runList(args);
      return;
    }
    if (args.action) {
      await runNonInteractive(args);
      return;
    }
    await runInteractive(args);
  } catch (err) {
    if (err?.name === "ExitPromptError") {
      console.log(chalk.dim("\n  Annulé.\n"));
      process.exit(0);
    }
    const msg = err?.message ? String(err.message) : "Erreur inconnue";
    process.stderr.write(chalk.red("Erreur : ") + msg + "\n");
    process.stderr.write(chalk.dim("Astuce: electron-health --help\n"));
    process.exit(1);
  }
}
