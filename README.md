# Fulgul: The Spark 🔥

**A comprehensive security scanning and system hardening desktop application**

Fulgul: The Spark is a powerful, user-friendly desktop application designed to help you secure your system through vulnerability scanning, attack simulations, and automated hardening. Whether you're a security professional, system administrator, or privacy-conscious user, Fulgul provides the tools you need to protect your system.

![Fulgul: The Spark](https://img.shields.io/badge/Version-0.1.0-blue) ![License](https://img.shields.io/badge/License-Proprietary-red) ![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

## ✨ Features

### 🔍 Vulnerability Scanning
- **Local Machine Scan**: Comprehensive security scan of your system
  - Detects outdated packages and security patches
  - Identifies misconfigured services
  - Checks file permissions and security settings
  - Analyzes open ports and network services
  - Scans for known vulnerabilities (CVE database)

- **Remote IP Scan**: Scan remote systems for security issues
  - Port scanning (1-500 ports)
  - Service detection and vulnerability matching
  - Real-time progress tracking
  - Safe scanning with rate limiting

### 🛡️ System Hardening
- **Automated Hardening Tasks**: 40+ security hardening tasks
  - Platform-specific recommendations (Windows, macOS, Linux)
  - One-click fix application
  - Interactive terminal for command execution
  - Manual step-by-step guides
  - Impact assessment and time estimates

- **Categories Covered**:
  - Firewall configuration
  - SSH/Remote access security
  - System updates and patching
  - Encryption setup
  - Access control
  - Password policies
  - Service hardening
  - Logging and monitoring

### 🎮 Attack Simulation Hub
- **Interactive Attack Scenarios**: Learn security through hands-on practice
  - Vulnerable web applications (DVWA-style)
  - Weak SSH credentials
  - SMB guest shares
  - Vulnerable REST APIs
  - Real-time command execution
  - Flag capture system
  - Progress tracking and scoring

### 📊 Security Dashboard
- **Real-time Monitoring**: Track your system's security posture
  - Security score (0-100) with visual gauge
  - Security grade (Excellent to Critical)
  - Vulnerability statistics
  - Scan history with timestamps
  - Remediation status tracking

### 🔧 Advanced Features
- **Fix Management**: Track and apply security fixes
  - Auto-fixable commands
  - Manual remediation steps
  - Status tracking (pending, in-progress, fixed, failed)
  - Interactive terminal for fix application
  - Password support for sudo commands

- **Scan History**: Review past scans and vulnerabilities
  - Complete scan history with timestamps
  - Vulnerability details and remediation status
  - Export scan results (JSON, CSV, PDF)
  - Filter and search capabilities

## 🚀 Installation

### Windows

1. **Download the Installer**
   - Download `fulgul_0.1.0_x64-setup.exe` (NSIS installer) or `fulgul_0.1.0_x64_en-US.msi` (MSI installer)

2. **Run the Installer**
   - Double-click the downloaded file
   - Follow the installation wizard
   - Choose installation location (default: `C:\Program Files\Fulgul`)

3. **Launch the Application**
   - Find "Fulgul" in the Start menu
   - Or run from the desktop shortcut

**System Requirements**:
- Windows 10 (version 1809 or later) or Windows 11
- 4 GB RAM minimum
- 100 MB free disk space

### macOS

1. **Download the DMG**
   - Download `fulgul_0.1.0_x64.dmg` (Intel) or `fulgul_0.1.0_arm64.dmg` (Apple Silicon)

2. **Install the Application**
   - Open the downloaded DMG file
   - Drag "Fulgul" to the Applications folder
   - Eject the DMG

3. **First Launch**
   - Open Applications folder
   - Right-click "Fulgul" → Open (first time only)
   - Click "Open" when prompted about unidentified developer

**System Requirements**:
- macOS 10.13 (High Sierra) or later
- 4 GB RAM minimum
- 100 MB free disk space

### Linux

#### AppImage (Recommended - Portable)

1. **Download the AppImage**
   - Download `fulgul_0.1.0_amd64.AppImage`

2. **Make it Executable**
   ```bash
   chmod +x fulgul_0.1.0_amd64.AppImage
   ```

3. **Run the Application**
   ```bash
   ./fulgul_0.1.0_amd64.AppImage
   ```

#### Debian/Ubuntu (.deb)

1. **Download the DEB Package**
   - Download `fulgul_0.1.0_amd64.deb`

2. **Install**
   ```bash
   sudo dpkg -i fulgul_0.1.0_amd64.deb
   sudo apt-get install -f  # Fix dependencies if needed
   ```

3. **Launch**
   ```bash
   fulgul
   ```

#### Red Hat/Fedora (.rpm)

1. **Download the RPM Package**
   - Download `fulgul_0.1.0.x86_64.rpm`

2. **Install**
   ```bash
   sudo rpm -i fulgul_0.1.0.x86_64.rpm
   # Or with dnf/yum
   sudo dnf install fulgul_0.1.0.x86_64.rpm
   ```

3. **Launch**
   ```bash
   fulgul
   ```

**System Requirements**:
- Linux kernel 3.10 or later
- glibc 2.17 or later
- 4 GB RAM minimum
- 100 MB free disk space

## 📖 User Guide

### Getting Started

1. **Launch Fulgul**
   - Open the application from your system menu or desktop shortcut

2. **Dashboard Overview**
   - The dashboard shows your system's security status at a glance
   - View security score, recent scans, and quick actions

3. **Run Your First Scan**
   - Click "Scan Local Machine" from the dashboard
   - Wait for the scan to complete (usually 1-3 minutes)
   - Review the results and security score

### Scanning Your System

#### Local Machine Scan

1. Navigate to **Scan Local** from the sidebar
2. Click **"Start Scan"** button
3. Monitor real-time progress:
   - Current scan step
   - Discovered vulnerabilities
   - Security score updates
4. Review results:
   - Security score and grade
   - List of vulnerabilities
   - Open ports and services
   - Recommended fixes

#### Remote IP Scan

1. Navigate to **Scan Remote** from the sidebar
2. Enter the target IP address (e.g., `192.168.1.10`)
3. Click **"Start Scan"**
4. Watch real-time progress:
   - Port scanning progress
   - Discovered open ports
   - Service detection
5. Review results:
   - Open ports list
   - Detected services
   - Potential vulnerabilities

**⚠️ Important**: Only scan IPs you own or have explicit permission to scan.

### System Hardening

1. Navigate to **Harden Systems** from the sidebar
2. Browse available hardening tasks:
   - Filter by priority (Critical, High, Medium, Low)
   - Filter by category (Firewall, SSH, Updates, etc.)
   - Search for specific tasks
3. Review task details:
   - Description and impact
   - Estimated time
   - Reboot requirements
   - Suggestions and manual steps
4. Apply fixes:
   - Click **"Apply Fix"** for auto-fixable tasks
   - Enter password if prompted (for sudo/admin commands)
   - Follow manual steps for tasks without auto-fix

### Attack Simulation Hub

1. Navigate to **Attack Hub** from the sidebar
2. Select a scenario:
   - Choose difficulty (Easy, Medium, Hard)
   - Read scenario description
   - View available flags
3. Start the attack:
   - Click **"Start Attack"**
   - Use the interactive terminal
   - Execute commands to progress
   - Capture flags to complete
4. Track progress:
   - View real-time logs
   - Monitor step completion
   - Check your score

### Managing Vulnerabilities

1. Navigate to **Vulnerabilities** from the sidebar
2. View all detected vulnerabilities:
   - Filter by severity
   - Filter by status
   - Search by title or description
3. Apply fixes:
   - Click on a vulnerability card
   - Review suggested fix
   - Click **"Apply Auto-Fix"** if available
   - Or follow manual steps
4. Track remediation:
   - Status updates (pending → in-progress → fixed)
   - View fix history
   - Export results

### Viewing Scan History

1. Navigate to **Scan History** from the sidebar
2. Browse past scans:
   - View by date
   - Filter by security score
   - See remediation status
3. Review details:
   - Click on a scan to view details
   - See all vulnerabilities from that scan
   - Check which fixes were applied

## 🎯 Common Use Cases

### First-Time Security Audit

1. Run a **Local Machine Scan**
2. Review the security score and vulnerabilities
3. Go to **Harden Systems** and apply critical/high priority fixes
4. Re-scan to verify improvements

### Regular Security Maintenance

1. Schedule weekly scans
2. Review new vulnerabilities
3. Apply recommended hardening tasks
4. Monitor security score trends

### Learning Security

1. Use the **Attack Hub** to practice
2. Try different scenarios
3. Learn common vulnerabilities
4. Practice remediation techniques

### Network Security Assessment

1. Use **Remote IP Scan** to check network devices
2. Identify exposed services
3. Review open ports
4. Apply network hardening recommendations

## ⚙️ Configuration

### Auto-Response Settings

Configure automated responses to security threats:

1. Navigate to **Auto-Response** from the sidebar
2. Enable features:
   - **Auto-Patch**: Automatically apply security patches
   - **Auto-Quarantine**: Isolate suspicious processes
   - **Auto-Notify**: Get alerts for security events
3. Set thresholds and delays
4. Save settings

### Preferences

- **Theme**: Dark mode (default) with cyber-security styling
- **Notifications**: Desktop notifications for security events
- **Auto-updates**: Check for application updates

## 🔒 Security & Privacy

### Data Storage

- All scan data is stored locally on your machine
- No data is sent to external servers
- Scan history stored in: `~/.fulgul/scan_history.json` (Linux/macOS) or `%APPDATA%\fulgul\scan_history.json` (Windows)

### Permissions

Some features require elevated permissions:
- **System Hardening**: May require administrator/sudo access
- **Port Scanning**: Requires network access
- **Service Management**: May require root/admin privileges

### Best Practices

1. **Run scans regularly** (weekly recommended)
2. **Review findings** before applying fixes
3. **Backup your system** before major hardening changes
4. **Test in a safe environment** first
5. **Keep the app updated** for latest vulnerability databases

## 🐛 Troubleshooting

### Application Won't Start

**Windows**:
- Check Windows Event Viewer for errors
- Install Visual C++ Redistributable: https://aka.ms/vs/17/release/vc_redist.x64.exe
- Run as administrator if needed

**macOS**:
- Right-click app → Open (first time)
- Check System Preferences → Security & Privacy
- Remove quarantine: `xattr -cr /Applications/Fulgul.app`

**Linux**:
- Check dependencies: `ldd fulgul` (for missing libraries)
- Install missing dependencies based on error messages
- Check file permissions: `chmod +x fulgul`

### Scan Fails or Hangs

1. Check system resources (CPU, RAM)
2. Ensure you have network connectivity (for remote scans)
3. Verify you have necessary permissions
4. Try running as administrator/sudo
5. Check application logs

### Hardening Tasks Fail

1. Verify you have required permissions
2. Check if the task is applicable to your OS version
3. Review error messages in the terminal
4. Try manual steps instead of auto-fix
5. Ensure system is not in a restricted state

### Terminal Commands Not Working

1. Verify the command syntax is correct for your OS
2. Check if required tools are installed
3. Ensure you're using the correct shell (bash on Linux/macOS, PowerShell on Windows)
4. Review command output for specific errors

## 📞 Support

### Getting Help

- **Documentation**: Check this README and the deployment guides
- **Issues**: Report bugs or request features through the issue tracker
- **Community**: Join discussions and share experiences

### Reporting Issues

When reporting issues, please include:
- Operating system and version
- Fulgul version
- Steps to reproduce
- Error messages or screenshots
- System logs (if applicable)

## 🔄 Updates

### Checking for Updates

- The application will notify you when updates are available
- Or manually check: Help → Check for Updates

### Updating

**Windows**: Download and run the new installer
**macOS**: Download new DMG and replace the app
**Linux**: Download new package and install (will upgrade existing installation)

## 📝 License

This software is proprietary. All rights reserved.

## 🙏 Acknowledgments

Built with:
- [Tauri](https://tauri.app/) - Framework for building desktop apps
- [Next.js](https://nextjs.org/) - React framework
- [Material-UI](https://mui.com/) - UI components
- [Rust](https://www.rust-lang.org/) - Systems programming language

## 📚 Additional Resources

- **Security Best Practices**: See hardening task descriptions
- **Vulnerability Database**: CVE information in scan results
- **Attack Scenarios**: Educational content in Attack Hub

---

**Stay Secure! 🔒**

For the latest updates and security advisories, visit our website or check the application's update notifications.
