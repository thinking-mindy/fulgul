#!/bin/bash

# Tauri Key Generation Script
# This script generates Tauri signing keys for code signing

echo "🔑 Generating Tauri Signing Keys..."
echo ""
echo "You will be prompted to enter a password."
echo "⚠️  IMPORTANT: Remember this password - you'll need it for GitHub Secrets!"
echo ""

# Create .tauri directory if it doesn't exist
mkdir -p ~/.tauri

# Generate the key
npx @tauri-apps/cli signer generate -w ~/.tauri/fulgul.key

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Key generated successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Copy your private key:"
    echo "   cat ~/.tauri/fulgul.key"
    echo ""
    echo "2. Add to GitHub Secrets:"
    echo "   - Go to: https://github.com/thinking-mindy/fulgul/settings/secrets/actions"
    echo "   - Add secret: TAURI_PRIVATE_KEY (paste the key content)"
    echo "   - Add secret: TAURI_KEY_PASSWORD (enter your password)"
    echo ""
    echo "3. The public key was displayed above - save it for reference"
else
    echo "❌ Key generation failed. Please try again."
    exit 1
fi

