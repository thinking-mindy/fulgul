# Build script for Windows deployment
# Run this on a Windows machine with PowerShell

$ErrorActionPreference = "Stop"

Write-Host "🚀 Building Fulgul for Windows..." -ForegroundColor Cyan

# Check if we're on Windows
if ($PSVersionTable.Platform -and $PSVersionTable.Platform -ne "Win32NT") {
    Write-Host "❌ Error: This script must be run on Windows" -ForegroundColor Red
    exit 1
}

# Check for required tools
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

# Check Rust
try {
    $rustVersion = rustc --version
    Write-Host "✅ Rust found: $rustVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Rust is required. Install from https://rustup.rs" -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is required. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is required" -ForegroundColor Red
    exit 1
}

# Check Tauri CLI
try {
    $tauriVersion = tauri --version
    Write-Host "✅ Tauri CLI found: $tauriVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Tauri CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g @tauri-apps/cli@latest
}

# Detect architecture
$arch = [System.Environment]::Is64BitOperatingSystem
if ($arch) {
    Write-Host "📱 Building for 64-bit (x86_64)" -ForegroundColor Cyan
    $target = "x86_64-pc-windows-msvc"
} else {
    Write-Host "📱 Building for 32-bit (i686)" -ForegroundColor Cyan
    $target = "i686-pc-windows-msvc"
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Build frontend
Write-Host "🏗️  Building frontend..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build frontend" -ForegroundColor Red
    exit 1
}

# Build Tauri app with NSIS installer (EXE)
Write-Host "🔨 Building Windows EXE installer (NSIS)..." -ForegroundColor Yellow
if ($arch) {
    npm run tauri:build:win
} else {
    npm run tauri:build:win:ia32
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build Tauri app" -ForegroundColor Red
    exit 1
}

# Find output
$exePath = "src-tauri\target\$target\release\fulgul.exe"
$nsisPath = "src-tauri\target\$target\release\bundle\nsis\"

Write-Host ""
Write-Host "✅ Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Executable: $exePath" -ForegroundColor Cyan
Write-Host "💿 NSIS Installer (EXE): $nsisPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test the app, run:" -ForegroundColor Yellow
Write-Host "  Start-Process `"$exePath`"" -ForegroundColor White
Write-Host ""

