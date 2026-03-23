# ⚡ electron-health

Utilitaire CLI pour détecter, nettoyer et remplacer les apps Electron sur macOS.

## Installation

```bash
cd electron-health
npm install
```

## Utilisation

```bash
npm start

electron-health
```

## Options utiles

- Interactif par défaut (sélection + actions).
- Sûr par défaut : déplace en **Corbeille** (pas de suppression définitive).

```bash
electron-health --help
electron-health --version

electron-health --list
electron-health --list --json

electron-health --action cache --all --dry-run
electron-health --action all --app Slack --yes

electron-health --only-known --exclude "discord" --list
electron-health --extended --action cache --all --dry-run

electron-health --force --action all --app "Visual Studio Code" --yes
```

## Ce que ça fait

1. **Scan** — Détecte toutes les apps Electron dans `/Applications` et `~/Applications`
2. **Alternatives** — Propose des remplaçants natifs macOS ou web pour chaque app connue
3. **Nettoyage** — Pour chaque app sélectionnée, propose :
   - 🗑 Supprimer l'app + tous ses caches (App Support, Caches, Logs, WebKit, Cookies…)
   - 🧹 Nettoyer uniquement les caches
   - 📋 Voir les alternatives recommandées
   - ⏭ Ignorer

## Apps reconnues et leurs alternatives

| App Electron | Alternative native / web |
|---|---|
| VSCode / Cursor | Zed, Nova, Xcode |
| Slack | Slack Web |
| Discord | Swiftcord, Ripcord, Discord Web |
| Figma | Figma Web, Sketch |
| Notion | Craft, Bear, Notion Web |
| Obsidian | Bear, Craft, iA Writer |
| Postman | Paw, Bruno |
| GitHub Desktop | Fork, Tower |
| Hyper | Warp, iTerm2 |
| Spotify | Spotify Web |
| … | … |


