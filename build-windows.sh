#!/bin/bash

# Build script for Windows deployment
# ⚠️  WARNING: Cross-compiling Windows from Linux requires additional setup
# For best results, build on Windows using build-windows.ps1

set -e

echo "🚀 Building Fulgul for Windows..."
echo "⚠️  Note: Windows builds require MSVC linker. For cross-compilation from Linux,"
echo "   you may need to install mingw-w64 or use a Windows machine."
echo ""

# Check for required tools
command -v rustc >/dev/null 2>&1 || { echo "❌ Rust is required. Install from https://rustup.rs"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v tauri >/dev/null 2>&1 || { echo "❌ Tauri CLI is required. Run: npm install -g @tauri-apps/cli"; exit 1; }

# Check if we're on Linux and warn about cross-compilation
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "⚠️  Cross-compiling Windows from Linux..."
    echo "   If you encounter linker errors, you have two options:"
    echo "   1. Install mingw-w64: sudo apt-get install mingw-w64"
    echo "   2. Build on Windows instead (recommended)"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Build cancelled. Use a Windows machine or install mingw-w64."
        exit 1
    fi
fi

# Install Windows target if not already installed
echo "📦 Installing Windows target..."
rustup target add x86_64-pc-windows-msvc

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🏗️  Building frontend..."
npm run build

# Build Tauri app with NSIS installer (EXE)
echo "🔨 Building Windows EXE installer..."
npm run tauri:build:win

TARGET="x86_64-pc-windows-msvc"
EXE_PATH="src-tauri/target/$TARGET/release/bundle/nsis/"

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 Windows EXE installer: $EXE_PATH"
echo ""
echo "The installer is ready for distribution."
echo ""

