<div align="center">

# Fulgul: The Spark

**Free desktop security platform** — Blue Team defense, Red Team labs, and a real shell in one app.

[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/thinking-mindy/fulgul)
[![Version](https://img.shields.io/badge/Version-1.0.5-blue)](https://github.com/thinking-mindy/fulgul/releases/tag/v1.0.5)
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

Grab installers from **[Releases](https://github.com/thinking-mindy/fulgul/releases)**:

| Release | When |
|---------|------|
| Version tags (`v1.0.5`, …) | Stable downloads |
| **Continuous** | Latest successful build from `main` |

| Platform | Package |
|----------|---------|
| Windows | NSIS `.exe` / MSI |
| macOS | Intel / Apple Silicon `.dmg` |
| Linux | `.deb` / AppImage / `.rpm` |

**macOS first launch:** right-click → Open, or run `xattr -cr /Applications/Fulgul.app`.

---

## Quick start

1. Install and launch Fulgul
2. Run **Scan Local Machine**
3. Open **Harden Systems** and apply critical fixes
4. Or start from **Blue Team** / **Red Team** hubs for the full pipeline

---

## Build from source

**Prerequisites:** Node.js 20+, [Rust / Cargo](https://rustup.rs) (stable), and your platform WebView/dev libraries ([Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)).

### Quick path (recommended)

Uses the Tauri CLI via npm — builds the frontend and bundles installers in one step.

```bash
npm install
npm run tauri:dev          # development (hot reload)
npm run tauri:build        # production installers for your OS
```

Platform-specific bundles:

```bash
npm run tauri:build:linux:deb        # Linux .deb
npm run tauri:build:linux:appimage   # Linux AppImage
npm run tauri:build:win              # Windows NSIS .exe
npm run tauri:build:mac              # macOS Intel .dmg
npm run tauri:build:mac:arm          # macOS Apple Silicon .dmg
```

Helper scripts: `./build-linux.sh`, `./build-macos.sh`, `./build-windows.sh`

### Using Cargo directly

Useful for Rust-only checks, faster iteration on the backend, or CI-style cross-compiles.

**1. Install the target triple** (match your OS):

```bash
# Linux
rustup target add x86_64-unknown-linux-gnu

# Windows (from Linux/macOS cross-build, or native on Windows)
rustup target add x86_64-pc-windows-msvc

# macOS
rustup target add x86_64-apple-darwin aarch64-apple-darwin
```

**2. Build the frontend first** (Tauri embeds the static export from `out/`):

```bash
npm install
npm run build
```

**3. Run Cargo from `src-tauri/`:**

```bash
cd src-tauri

cargo check                         # fast compile check
cargo build                         # debug binary
cargo build --release               # optimized binary (current host target)

# Cross-target release binaries (after rustup target add …)
cargo build --release --target x86_64-unknown-linux-gnu
cargo build --release --target x86_64-pc-windows-msvc
cargo build --release --target x86_64-apple-darwin
cargo build --release --target aarch64-apple-darwin
```

**Binary output** (no installer bundle):

| Target | Path |
|--------|------|
| Host | `src-tauri/target/release/fulgul` |
| Linux | `src-tauri/target/x86_64-unknown-linux-gnu/release/fulgul` |
| Windows | `src-tauri/target/x86_64-pc-windows-msvc/release/fulgul.exe` |
| macOS Intel | `src-tauri/target/x86_64-apple-darwin/release/fulgul` |
| macOS ARM | `src-tauri/target/aarch64-apple-darwin/release/fulgul` |

Run the debug binary during backend work:

```bash
cd src-tauri && cargo run
```

> **Note:** `cargo build --release` produces the app binary only. For `.deb`, `.AppImage`, `.exe` installer, or `.dmg`, use `npm run tauri:build` (or the platform scripts above) after `npm run build`.

**Linux system packages** (Debian/Ubuntu example):

```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget \
  libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf
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

**Email:** [thinkingmindszw@gmail.com](mailto:thinkingmindszw@gmail.com)  
**Site:** [thinkingminds.co.zw](https://thinkingminds.co.zw)

---

## License

Free to use. See [LICENSE](LICENSE) for terms.
