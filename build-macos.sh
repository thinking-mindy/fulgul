#!/bin/bash

# Build script for macOS deployment
# Run this on a macOS machine

set -e

echo "🚀 Building Fulgul for macOS..."

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: This script must be run on macOS"
    exit 1
fi

# Check for required tools
command -v rustc >/dev/null 2>&1 || { echo "❌ Rust is required. Install from https://rustup.rs"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v tauri >/dev/null 2>&1 || { echo "❌ Tauri CLI is required. Run: npm install -g @tauri-apps/cli"; exit 1; }

# Detect architecture
ARCH=$(uname -m)
echo "📱 Detected architecture: $ARCH"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🏗️  Building frontend..."
npm run build

# Build Tauri app
echo "🔨 Building Tauri app with DMG..."

if [ "$ARCH" = "arm64" ]; then
    echo "Building for Apple Silicon (ARM64)..."
    npm run tauri:build:mac:arm
elif [ "$ARCH" = "x86_64" ]; then
    echo "Building for Intel (x86_64)..."
    npm run tauri:build:mac
else
    echo "Building universal binary..."
    npm run tauri:build:mac:universal
fi

# Find output
if [ "$ARCH" = "arm64" ]; then
    TARGET="aarch64-apple-darwin"
elif [ "$ARCH" = "x86_64" ]; then
    TARGET="x86_64-apple-darwin"
else
    TARGET="universal-apple-darwin"
fi

APP_PATH="src-tauri/target/$TARGET/release/bundle/macos/fulgul.app"
DMG_PATH="src-tauri/target/$TARGET/release/bundle/dmg/"

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 App bundle: $APP_PATH"
echo "💿 DMG files: $DMG_PATH"
echo ""
echo "To test the app, run:"
echo "  open $APP_PATH"
echo ""

