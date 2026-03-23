export const ALTERNATIVES = {
  "Visual Studio Code": {
    reason: "Lourd Electron, RAM gourmand",
    alternatives: [
      { name: "Zed", type: "🍎 natif", url: "https://zed.dev" },
      { name: "Nova", type: "🍎 natif", url: "https://nova.app" },
      { name: "Xcode", type: "🍎 natif", url: "xcode" },
    ],
  },
  Cursor: {
    reason: "Fork VSCode Electron, très lourd",
    alternatives: [
      { name: "Zed", type: "🍎 natif", url: "https://zed.dev" },
      {
        name: "Copilot in Xcode",
        type: "🍎 natif",
        url: "https://github.com/features/copilot",
      },
    ],
  },
  Atom: {
    reason: "Abandonné + Electron",
    alternatives: [{ name: "Zed", type: "🍎 natif", url: "https://zed.dev" }],
  },
  Slack: {
    reason: "Electron notoire, 1 Go+ RAM idle",
    alternatives: [
      { name: "Slack Web", type: "🌐 web", url: "https://app.slack.com" },
      { name: "Mimestream", type: "🍎 natif", url: "https://mimestream.com" },
    ],
  },
  Discord: {
    reason: "Electron, 500 Mo+ RAM pour du chat",
    alternatives: [
      {
        name: "Swiftcord",
        type: "🍎 natif",
        url: "https://github.com/cryptoAlgorithm/Swiftcord",
      },
      { name: "Ripcord", type: "🍎 natif", url: "https://cancel.fm/ripcord/" },
      { name: "Discord Web", type: "🌐 web", url: "https://discord.com/app" },
    ],
  },
  Skype: {
    reason: "Electron abandonné par Microsoft",
    alternatives: [
      { name: "FaceTime", type: "🍎 natif", url: "system" },
      { name: "Skype Web", type: "🌐 web", url: "https://web.skype.com" },
    ],
  },
  WhatsApp: {
    reason: "Electron, alternative native disponible",
    alternatives: [{ name: "Beeper", type: "🍎 natif", url: "https://www.beeper.com" }],
  },
  Telegram: {
    reason: "Version Electron vs native disponible",
    alternatives: [
      {
        name: "Telegram (MAS)",
        type: "🍎 natif",
        url: "https://apps.apple.com/app/telegram/id747648890",
      },
    ],
  },
  Figma: {
    reason: "Electron, version web identique",
    alternatives: [
      { name: "Figma Web", type: "🌐 web", url: "https://figma.com" },
      { name: "Sketch", type: "🍎 natif", url: "https://www.sketch.com" },
    ],
  },
  Notion: {
    reason: "Electron lent, web plus rapide",
    alternatives: [
      { name: "Notion Web", type: "🌐 web", url: "https://notion.so" },
      { name: "Craft", type: "🍎 natif", url: "https://craft.do" },
      { name: "Bear", type: "🍎 natif", url: "https://bear.app" },
    ],
  },
  Obsidian: {
    reason: "Electron, alternatives natives plus légères",
    alternatives: [
      { name: "Bear", type: "🍎 natif", url: "https://bear.app" },
      { name: "Craft", type: "🍎 natif", url: "https://craft.do" },
      { name: "iA Writer", type: "🍎 natif", url: "https://ia.net/writer" },
    ],
  },
  Postman: {
    reason: "Electron lourd pour tester des APIs",
    alternatives: [
      { name: "Paw (RapidAPI)", type: "🍎 natif", url: "https://paw.cloud" },
      { name: "Proxyman", type: "🍎 natif", url: "https://proxyman.io" },
      { name: "HTTPie Desktop", type: "🌐 web", url: "https://httpie.io/app" },
    ],
  },
  Insomnia: {
    reason: "Electron, alternatives plus légères",
    alternatives: [
      { name: "Paw (RapidAPI)", type: "🍎 natif", url: "https://paw.cloud" },
      { name: "Bruno", type: "🍎 natif", url: "https://www.usebruno.com" },
    ],
  },
  "GitHub Desktop": {
    reason: "Electron, clients natifs bien supérieurs",
    alternatives: [
      { name: "Fork", type: "🍎 natif", url: "https://git-fork.com" },
      { name: "Tower", type: "🍎 natif", url: "https://www.git-tower.com" },
      { name: "SourceTree", type: "🍎 natif", url: "https://sourcetreeapp.com" },
    ],
  },
  Hyper: {
    reason: "Terminal Electron… pour un terminal",
    alternatives: [
      { name: "Warp", type: "🍎 natif", url: "https://www.warp.dev" },
      { name: "iTerm2", type: "🍎 natif", url: "https://iterm2.com" },
      { name: "Terminal.app", type: "🍎 natif", url: "system" },
    ],
  },
  Spotify: {
    reason: "Electron, consomme 300-800 Mo RAM",
    alternatives: [
      { name: "Spotify Web", type: "🌐 web", url: "https://open.spotify.com" },
      { name: "Scrobbles (Last.fm)", type: "🍎 natif", url: "https://apps.apple.com" },
    ],
  },
  "1Password 7": {
    reason: "Ancienne version Electron",
    alternatives: [{ name: "1Password 8", type: "🍎 natif", url: "https://1password.com" }],
  },
  Linear: {
    reason: "Electron, web app identique",
    alternatives: [{ name: "Linear Web", type: "🌐 web", url: "https://linear.app" }],
  },
  Asana: {
    reason: "Electron inutile, même chose en web",
    alternatives: [{ name: "Asana Web", type: "🌐 web", url: "https://app.asana.com" }],
  },
};

