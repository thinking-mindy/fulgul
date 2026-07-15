#!/bin/bash

# Build script for Linux deployment
# Builds both DEB and AppImage packages

set -e

echo "🚀 Building Fulgul for Linux..."

# Check if we're on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "⚠️  Warning: This script is designed for Linux. Cross-compilation may not work."
fi

# Check for required tools
command -v rustc >/dev/null 2>&1 || { echo "❌ Rust is required. Install from https://rustup.rs"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v tauri >/dev/null 2>&1 || { echo "❌ Tauri CLI is required. Run: npm install -g @tauri-apps/cli"; exit 1; }

# Install Linux target if not already installed
echo "📦 Installing Linux target..."
rustup target add x86_64-unknown-linux-gnu

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🏗️  Building frontend..."
npm run build

# Build Tauri app with DEB bundle
echo "🔨 Building DEB package..."
npm run tauri:build:linux:deb

# Build Tauri app with AppImage bundle
echo "🔨 Building AppImage..."
npm run tauri:build:linux:appimage

TARGET="x86_64-unknown-linux-gnu"
DEB_PATH="src-tauri/target/$TARGET/release/bundle/deb/"
APPIMAGE_PATH="src-tauri/target/$TARGET/release/bundle/appimage/"

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 DEB package: $DEB_PATH"
echo "📦 AppImage: $APPIMAGE_PATH"
echo ""
echo "To install the DEB package:"
echo "  sudo dpkg -i $DEB_PATH*.deb"
echo ""
echo "To run the AppImage:"
echo "  chmod +x $APPIMAGE_PATH*.AppImage"
echo "  ./$APPIMAGE_PATH*.AppImage"
echo ""

