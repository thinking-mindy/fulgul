# GitHub Actions CI/CD Setup

This repository includes GitHub Actions workflows for automatically building Fulgul for all platforms.

## Available Workflows

### 1. Build Windows (`build-windows.yml`)
Builds Windows NSIS installer (EXE) on Windows runners.

**Triggers:**
- Push to tags matching `v*` (e.g., `v0.1.0`)
- Manual trigger via `workflow_dispatch`

**Outputs:**
- `fulgul-windows-x64-nsis`: NSIS installer (EXE)
- `fulgul-windows-x64-exe`: Standalone executable

**Usage:**
```bash
# Trigger manually from GitHub Actions tab
# Or push a tag:
git tag v0.1.0
git push origin v0.1.0
```

### 2. Build Linux (`build-linux.yml`)
Builds Linux DEB package and AppImage on Ubuntu runners.

**Triggers:**
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
- Push to tags matching `v*`
- Manual trigger via `workflow_dispatch`

**Outputs:**
- `fulgul-macos-intel`: Intel DMG
- `fulgul-macos-arm`: Apple Silicon DMG

## Setting Up Secrets (Optional)

For code signing, add these secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

- `TAURI_PRIVATE_KEY`: Your Tauri private key (for code signing)
- `TAURI_KEY_PASSWORD`: Password for your private key

**Note:** Secrets are optional. The build will work without them, but binaries won't be code-signed.

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

1. Go to **Actions** tab in GitHub
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

## Workflow Status

Check workflow status:
- **Green checkmark**: Build succeeded
- **Red X**: Build failed (check logs)
- **Yellow circle**: Build in progress

## Troubleshooting

### Build Fails
1. Check the workflow logs
2. Look for error messages
3. Common issues:
   - Missing dependencies
   - Rust compilation errors
   - Frontend build errors

### Artifacts Not Uploaded
- Check if the build completed successfully
- Verify file paths in workflow
- Check artifact size limits (GitHub has limits)

### Release Not Created
- Ensure you pushed a tag starting with `v`
- Check if workflow has permission to create releases
- Verify `GITHUB_TOKEN` is available

## Customization

### Modify Build Commands
Edit the workflow files in `.github/workflows/`:
- `build-windows.yml`
- `build-linux.yml`
- `build-macos.yml`

### Add More Platforms
1. Create a new workflow file
2. Use appropriate runner (e.g., `ubuntu-latest`, `windows-latest`, `macos-latest`)
3. Follow the pattern from existing workflows

### Change Trigger Conditions
Modify the `on:` section in workflow files:
```yaml
on:
  push:
    branches: [main]  # Build on push to main
    tags: ['v*']      # Build on version tags
  workflow_dispatch:  # Allow manual trigger
```

## Best Practices

1. **Use Tags for Releases**: Tag your releases with semantic versioning
2. **Test Locally First**: Build locally before pushing tags
3. **Monitor Workflows**: Check workflow status regularly
4. **Keep Secrets Secure**: Never commit secrets to the repository
5. **Use Artifact Retention**: Set appropriate retention days for artifacts

## Support

For issues with GitHub Actions:
- Check [GitHub Actions Documentation](https://docs.github.com/en/actions)
- Review workflow logs for errors
- Open an issue in the repository

