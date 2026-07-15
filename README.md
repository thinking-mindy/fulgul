<div align="center">

# Fulgul: The Spark

**Free desktop security platform** — Blue Team defense, Red Team labs, and a real shell in one app.

[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/thinking-mindy/fulgul)
[![Version](https://img.shields.io/badge/Version-0.1.0-blue)](https://github.com/thinking-mindy/fulgul/releases)
[![Price](https://img.shields.io/badge/Price-100%25%20Free-brightgreen)](https://github.com/thinking-mindy/fulgul)

[Download](https://github.com/thinking-mindy/fulgul/releases) · [Issues](https://github.com/thinking-mindy/fulgul/issues) · [Discussions](https://github.com/thinking-mindy/fulgul/discussions) · [Buy Me a Coffee](https://www.thinkingminds.co.zw/buy-coffee)

</div>

---

## What it is

Fulgul is a Tauri + React + Rust desktop app for **authorized** security work:

- **Blue Team** — scan, harden, triage vulnerabilities, auto-response, reports
- **Red Team** — engagement scope, recon, enumeration, attack/credential labs, loot, reports
- **Security Shell** — built-in terminal for local command execution

Data stays on your machine (`~/.fulgul/` or `%APPDATA%\fulgul\`). No account, no subscription, no telemetry.

> Use only on systems and networks you own or have written permission to assess.

---

## Features

### Blue Team

| Phase | Tool |
|-------|------|
| Scope | Asset Scope |
| Discovery | Local / Remote Scan |
| Assessment | Vulnerabilities |
| Analysis | Risk Analysis |
| Remediation | Harden Systems (40+ tasks) |
| Response | Auto Response |
| Reporting | Security Reports (MD / HTML / PDF) |

### Red Team

| Phase | Tool |
|-------|------|
| Planning | Engagement Scope |
| Intelligence | Recon Hub, Enumeration |
| Exploitation | Remote Vuln Scan, Attack Lab, Credential Lab |
| Post-exploit | Loot Vault |
| Reporting | Engagement Reports (MD / HTML / PDF) |

Also included: security score dashboard, scan history, and an integrated Security Shell (`/terminal`).

---

## Download

Grab the latest installer from **[Releases](https://github.com/thinking-mindy/fulgul/releases)**:

| Platform | Package |
|----------|---------|
| Windows | NSIS `.exe` / MSI |
| macOS | Intel / Apple Silicon `.dmg` |
| Linux | `.deb` / AppImage / `.rpm` |
| Android | APK / AAB (when published) |

**macOS first launch:** right-click → Open, or run `xattr -cr /Applications/Fulgul.app`.

---

## Quick start

1. Install and launch Fulgul
2. Run **Scan Local Machine**
3. Open **Harden Systems** and apply critical fixes
4. Or start from **Blue Team** / **Red Team** hubs for the full pipeline

---

## Build from source

Needs Node.js 20+, Rust (stable), and platform WebView/devtools.

```bash
npm install
npm run tauri:dev      # development
npm run tauri:build    # production installers
```

CI builds from this repo — see [docs/CI.md](docs/CI.md).

---

## Privacy

- Local storage only
- No cloud sync / no telemetry
- Elevated permissions only when you run hardening or some scans

---

## Support

Fulgul is free. If it helps you:

- ⭐ [Star the repo](https://github.com/thinking-mindy/fulgul)
- ☕ [Buy Me a Coffee](https://www.thinkingminds.co.zw/buy-coffee)
- 🐛 [Report an issue](https://github.com/thinking-mindy/fulgul/issues)

**Email:** [yhinkingmindszw@gmail.com](mailto:yhinkingmindszw@gmail.com)  
**Site:** [thinkingminds.co.zw](https://thinkingminds.co.zw)

---

## License

Free to use. See [LICENSE](LICENSE) for terms.
