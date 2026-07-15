# GitHub Actions CI/CD Setup

This repository includes GitHub Actions workflows that build Fulgul directly from **this repo** (`thinking-mindy/fulgul`).

## Available Workflows

### 1. Build Windows (`build-windows.yml`)
Builds Windows NSIS installer (EXE) on Windows runners.

**Triggers:**
- Push to `main`
- Push to tags matching `v*` (e.g., `v0.1.0`)
- Manual trigger via `workflow_dispatch`

**Outputs:**
- `fulgul-windows-x64-nsis`: NSIS installer (EXE)
- `fulgul-windows-x64-exe`: Standalone executable

### 2. Build Linux (`build-linux.yml`)
Builds Linux DEB package and AppImage on Ubuntu runners.

**Triggers:**
- Push to `main`
- Push to tags matching `v*`
- Manual trigger with bundle type selection

**Outputs:**
- `fulgul-linux-deb`: DEB package
- `fulgul-linux-appimage`: AppImage

**Manual Options:**
- `all`: Build both DEB and AppImage
- `deb`: Build only DEB package
- `appimage`: Build only AppImage

### 3. Build macOS (`build-macos.yml`)
Builds macOS DMG files for Intel and Apple Silicon.

**Triggers:**
- Push to `main`
- Push to tags matching `v*`
- Manual trigger via `workflow_dispatch`

**Outputs:**
- `fulgul-macos-intel`: Intel DMG
- `fulgul-macos-arm`: Apple Silicon DMG

### 4. Build Android (`build-android.yml`)
Builds Android APK / AAB with the Android NDK (`nttld/setup-ndk`) and `tauri android build`.

**Triggers:**
- Push to `main`
- Push to tags matching `v*`
- Manual trigger with build type selection

**Notes:**
- Installs NDK r26d and sets `NDK_HOME` / `ANDROID_NDK_HOME`
- Restores broken NDK clang symlinks on Linux runners
- Runs `tauri android init` then `tauri android build --apk` / `--aab`

## Setting Up Secrets (Optional)

Code signing secrets are optional. Builds work without them, but binaries won't be code-signed.

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Optionally add:

- `TAURI_PRIVATE_KEY`: Your Tauri private key (for code signing)
- `TAURI_KEY_PASSWORD`: Password for your private key

> **Note:** `SOURCE_REPO_TOKEN` is no longer required. Source code lives in this repository.

## Creating a Release

### Automatic Release (Recommended)

1. Create and push a version tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. GitHub Actions will automatically:
   - Build for all platforms
   - Create a GitHub Release
   - Attach all build artifacts

### Manual Release

1. Go to **Actions** tab in your repository
2. Select the workflow you want to run
3. Click **Run workflow**
4. Choose branch and options
5. Click **Run workflow**

## Downloading Builds

### From GitHub Releases
1. Go to **Releases** in your repository
2. Download the artifacts for your platform

### From Workflow Artifacts
1. Go to **Actions** tab
2. Click on a completed workflow run
3. Scroll down to **Artifacts**
4. Download the artifacts you need

## Troubleshooting

### Build Fails
1. Check the workflow logs
2. Look for error messages
3. Common issues:
   - Missing Linux system dependencies
   - Rust compilation errors
   - Frontend build errors
   - Missing Tauri signing key password (if signing is enabled)

### Artifacts Not Uploaded
- Check if the build completed successfully
- Verify file paths in workflow
- Check artifact size limits (GitHub has limits)

### Release Not Created
- Ensure you pushed a tag starting with `v`
- Check if workflow has permission to create releases
- Verify `GITHUB_TOKEN` is available

## Best Practices

1. **Use Tags for Releases**: Tag releases with semantic versioning
2. **Test Locally First**: Build locally before pushing tags
3. **Monitor Workflows**: Check workflow status regularly
4. **Keep Secrets Secure**: Never commit secrets to the repository
5. **Use Artifact Retention**: Set appropriate retention days for artifacts
