use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HardeningTask {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub status: String, // "pending", "completed", "failed", "in-progress"
    pub suggestions: Vec<String>,
    pub priority: String, // "low", "medium", "high", "critical"
    pub platform: Vec<String>, // "linux", "windows", "macos", "all"
    pub command: Option<String>, // Command to apply the fix
    #[serde(rename = "manualSteps")]
    pub manual_steps: Vec<String>, // Manual steps if command is not available
    pub impact: String, // "low", "medium", "high" - impact on system
    #[serde(rename = "requiresReboot")]
    pub requires_reboot: bool,
    #[serde(rename = "estimatedTime")]
    pub estimated_time: String, // e.g., "5 minutes"
}

impl HardeningTask {
    pub fn new(
        id: String,
        name: String,
        description: String,
        category: String,
        priority: String,
        platform: Vec<String>,
    ) -> Self {
        Self {
            id,
            name,
            description,
            category,
            status: "pending".to_string(),
            suggestions: Vec::new(),
            priority,
            platform,
            command: None,
            manual_steps: Vec::new(),
            impact: "medium".to_string(),
            requires_reboot: false,
            estimated_time: "5 minutes".to_string(),
        }
    }

    pub fn with_command(mut self, command: String) -> Self {
        self.command = Some(command);
        self
    }

    pub fn with_manual_steps(mut self, steps: Vec<String>) -> Self {
        self.manual_steps = steps;
        self
    }

    pub fn with_suggestions(mut self, suggestions: Vec<String>) -> Self {
        self.suggestions = suggestions;
        self
    }

    pub fn with_impact(mut self, impact: String) -> Self {
        self.impact = impact;
        self
    }

    pub fn with_reboot(mut self, requires: bool) -> Self {
        self.requires_reboot = requires;
        self
    }

    pub fn with_time(mut self, time: String) -> Self {
        self.estimated_time = time;
        self
    }
}

pub fn get_all_hardening_tasks() -> Vec<HardeningTask> {
    let mut tasks = Vec::new();

    // Linux-specific tasks
    tasks.extend(get_linux_tasks());
    
    // Windows-specific tasks
    tasks.extend(get_windows_tasks());
    
    // macOS-specific tasks
    tasks.extend(get_macos_tasks());
    
    // Cross-platform tasks
    tasks.extend(get_cross_platform_tasks());

    tasks
}

fn get_linux_tasks() -> Vec<HardeningTask> {
    vec![
        HardeningTask::new(
            generate_id(),
            "Disable Root SSH Login".to_string(),
            "Prevent direct root login via SSH to reduce attack surface".to_string(),
            "ssh".to_string(),
            "critical".to_string(),
            vec!["linux".to_string()],
        )
        .with_command("sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config && sudo systemctl restart sshd".to_string())
        .with_suggestions(vec![
            "Edit /etc/ssh/sshd_config".to_string(),
            "Set PermitRootLogin no".to_string(),
            "Restart SSH service: sudo systemctl restart sshd".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("2 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Configure UFW Firewall".to_string(),
            "Set up Uncomplicated Firewall with default deny policy".to_string(),
            "firewall".to_string(),
            "critical".to_string(),
            vec!["linux".to_string()],
        )
        .with_command("sudo ufw default deny incoming && sudo ufw default allow outgoing && sudo ufw enable".to_string())
        .with_suggestions(vec![
            "Install UFW if not present: sudo apt install ufw".to_string(),
            "Set default policies: sudo ufw default deny incoming".to_string(),
            "Allow SSH: sudo ufw allow 22/tcp".to_string(),
            "Enable firewall: sudo ufw enable".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("5 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Enable Automatic Security Updates".to_string(),
            "Configure unattended-upgrades for automatic security patches".to_string(),
            "updates".to_string(),
            "high".to_string(),
            vec!["linux".to_string()],
        )
        .with_command("sudo apt install unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades".to_string())
        .with_suggestions(vec![
            "Install unattended-upgrades package".to_string(),
            "Configure automatic updates: sudo dpkg-reconfigure unattended-upgrades".to_string(),
            "Review /etc/apt/apt.conf.d/50unattended-upgrades".to_string(),
        ])
        .with_impact("medium".to_string())
        .with_time("10 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Harden SSH Configuration".to_string(),
            "Apply secure SSH settings (disable weak protocols, enable key-only auth)".to_string(),
            "ssh".to_string(),
            "high".to_string(),
            vec!["linux".to_string()],
        )
        .with_command("sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup && sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config && sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config && sudo systemctl restart sshd".to_string())
        .with_suggestions(vec![
            "Disable password authentication: PasswordAuthentication no".to_string(),
            "Enable key-based authentication: PubkeyAuthentication yes".to_string(),
            "Disable root login: PermitRootLogin no".to_string(),
            "Change default port (optional): Port 2222".to_string(),
            "Restart SSH: sudo systemctl restart sshd".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("5 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Remove World-Writable Files".to_string(),
            "Find and secure files with overly permissive permissions".to_string(),
            "permissions".to_string(),
            "medium".to_string(),
            vec!["linux".to_string()],
        )
        .with_command("sudo find / -type f -perm -002 -exec chmod o-w {} \\; 2>/dev/null".to_string())
        .with_suggestions(vec![
            "Find world-writable files: find / -type f -perm -002".to_string(),
            "Review and remove unnecessary permissions".to_string(),
            "Audit SUID/SGID binaries: find / -type f \\( -perm -4000 -o -perm -2000 \\)".to_string(),
        ])
        .with_impact("medium".to_string())
        .with_time("15 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Enable AppArmor or SELinux".to_string(),
            "Configure mandatory access control for application security".to_string(),
            "access-control".to_string(),
            "high".to_string(),
            vec!["linux".to_string()],
        )
        .with_command("sudo systemctl enable apparmor && sudo systemctl start apparmor".to_string())
        .with_suggestions(vec![
            "For Ubuntu/Debian: Install and enable AppArmor".to_string(),
            "For RHEL/CentOS: Configure SELinux in enforcing mode".to_string(),
            "Review profiles/policies for your applications".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("20 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Configure Kernel Parameters".to_string(),
            "Harden kernel settings to prevent common attacks".to_string(),
            "kernel".to_string(),
            "high".to_string(),
            vec!["linux".to_string()],
        )
        .with_command("echo 'net.ipv4.ip_forward=0' | sudo tee -a /etc/sysctl.conf && echo 'net.ipv4.conf.all.send_redirects=0' | sudo tee -a /etc/sysctl.conf && sudo sysctl -p".to_string())
        .with_suggestions(vec![
            "Disable IP forwarding: net.ipv4.ip_forward=0".to_string(),
            "Disable ICMP redirects: net.ipv4.conf.all.send_redirects=0".to_string(),
            "Enable SYN flood protection: net.ipv4.tcp_syncookies=1".to_string(),
            "Apply changes: sudo sysctl -p".to_string(),
        ])
        .with_impact("medium".to_string())
        .with_time("5 minutes".to_string())
        .with_reboot(true),

        HardeningTask::new(
            generate_id(),
            "Install and Configure Fail2ban".to_string(),
            "Protect against brute-force attacks on SSH and other services".to_string(),
            "intrusion-detection".to_string(),
            "high".to_string(),
            vec!["linux".to_string()],
        )
        .with_command("sudo apt install fail2ban && sudo systemctl enable fail2ban && sudo systemctl start fail2ban".to_string())
        .with_suggestions(vec![
            "Install fail2ban: sudo apt install fail2ban".to_string(),
            "Configure jail.local for SSH protection".to_string(),
            "Enable and start service: sudo systemctl enable fail2ban".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("10 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Disable Unused Services".to_string(),
            "Stop and disable unnecessary services to reduce attack surface".to_string(),
            "services".to_string(),
            "medium".to_string(),
            vec!["linux".to_string()],
        )
        .with_command("sudo systemctl list-unit-files --type=service --state=enabled | grep -v 'systemd\\|dbus' | awk '{print $1}' | xargs -I {} sudo systemctl disable {} 2>/dev/null || true".to_string())
        .with_suggestions(vec![
            "List enabled services: systemctl list-unit-files --type=service --state=enabled".to_string(),
            "Review and disable unnecessary services".to_string(),
            "Be careful not to disable critical system services".to_string(),
        ])
        .with_impact("low".to_string())
        .with_time("15 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Configure Log Rotation and Retention".to_string(),
            "Ensure proper log management to prevent disk fill attacks".to_string(),
            "logging".to_string(),
            "medium".to_string(),
            vec!["linux".to_string()],
        )
        .with_command("sudo sed -i 's/rotate 4/rotate 12/' /etc/logrotate.conf && sudo sed -i 's/weekly/monthly/' /etc/logrotate.conf".to_string())
        .with_suggestions(vec![
            "Edit /etc/logrotate.conf".to_string(),
            "Set appropriate rotation and retention policies".to_string(),
            "Configure log size limits".to_string(),
        ])
        .with_impact("low".to_string())
        .with_time("5 minutes".to_string()),
    ]
}

fn get_windows_tasks() -> Vec<HardeningTask> {
    vec![
        HardeningTask::new(
            generate_id(),
            "Enable Windows Firewall".to_string(),
            "Configure Windows Firewall with Advanced Security".to_string(),
            "firewall".to_string(),
            "critical".to_string(),
            vec!["windows".to_string()],
        )
        .with_command("netsh advfirewall set allprofiles state on".to_string())
        .with_suggestions(vec![
            "Enable firewall for all profiles".to_string(),
            "Configure inbound rules to block by default".to_string(),
            "Allow only necessary applications".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("10 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Enable Windows Defender Real-time Protection".to_string(),
            "Ensure Windows Defender is running and up to date".to_string(),
            "antivirus".to_string(),
            "critical".to_string(),
            vec!["windows".to_string()],
        )
        .with_command("Set-MpPreference -DisableRealtimeMonitoring $false".to_string())
        .with_suggestions(vec![
            "Enable real-time protection in Windows Defender".to_string(),
            "Schedule regular quick and full scans".to_string(),
            "Keep definitions updated automatically".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("5 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Enable Windows Update Automatic Updates".to_string(),
            "Configure automatic installation of security updates".to_string(),
            "updates".to_string(),
            "high".to_string(),
            vec!["windows".to_string()],
        )
        .with_command("reg add \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\" /v AUOptions /t REG_DWORD /d 4 /f".to_string())
        .with_suggestions(vec![
            "Configure Windows Update to install automatically".to_string(),
            "Set active hours for update installation".to_string(),
            "Enable automatic restart for updates".to_string(),
        ])
        .with_impact("medium".to_string())
        .with_time("5 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Disable SMBv1 Protocol".to_string(),
            "Remove legacy SMB protocol vulnerable to WannaCry-style attacks".to_string(),
            "network".to_string(),
            "critical".to_string(),
            vec!["windows".to_string()],
        )
        .with_command("Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol".to_string())
        .with_suggestions(vec![
            "Disable SMBv1: Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol".to_string(),
            "Verify SMBv2/v3 is enabled".to_string(),
            "Restart if required".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("5 minutes".to_string())
        .with_reboot(true),

        HardeningTask::new(
            generate_id(),
            "Enable BitLocker Encryption".to_string(),
            "Encrypt system drive to protect data at rest".to_string(),
            "encryption".to_string(),
            "high".to_string(),
            vec!["windows".to_string()],
        )
        .with_command("manage-bde -on C: -RecoveryPassword".to_string())
        .with_suggestions(vec![
            "Enable BitLocker on system drive".to_string(),
            "Store recovery key securely".to_string(),
            "Use TPM if available for automatic unlock".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("30 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Configure User Account Control (UAC)".to_string(),
            "Set UAC to highest level for better security".to_string(),
            "access-control".to_string(),
            "high".to_string(),
            vec!["windows".to_string()],
        )
        .with_command("reg add \"HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System\" /v ConsentPromptBehaviorAdmin /t REG_DWORD /d 2 /f".to_string())
        .with_suggestions(vec![
            "Set UAC to always notify".to_string(),
            "Require administrator approval for system changes".to_string(),
            "Don't disable UAC completely".to_string(),
        ])
        .with_impact("medium".to_string())
        .with_time("2 minutes".to_string())
        .with_reboot(true),

        HardeningTask::new(
            generate_id(),
            "Disable Remote Desktop if Not Needed".to_string(),
            "Close RDP port if remote access is not required".to_string(),
            "remote-access".to_string(),
            "high".to_string(),
            vec!["windows".to_string()],
        )
        .with_command("reg add \"HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server\" /v fDenyTSConnections /t REG_DWORD /d 1 /f".to_string())
        .with_suggestions(vec![
            "Disable Remote Desktop if not needed".to_string(),
            "If needed, use strong passwords and enable Network Level Authentication".to_string(),
            "Change default RDP port (3389) if enabled".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("2 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Enable Windows Event Logging".to_string(),
            "Configure comprehensive security event logging".to_string(),
            "logging".to_string(),
            "medium".to_string(),
            vec!["windows".to_string()],
        )
        .with_command("auditpol /set /category:\"Logon/Logoff\" /success:enable /failure:enable".to_string())
        .with_suggestions(vec![
            "Enable audit policies for logon/logoff".to_string(),
            "Enable object access auditing".to_string(),
            "Configure log retention policies".to_string(),
        ])
        .with_impact("medium".to_string())
        .with_time("10 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Disable Unnecessary Windows Features".to_string(),
            "Remove unused Windows features to reduce attack surface".to_string(),
            "services".to_string(),
            "medium".to_string(),
            vec!["windows".to_string()],
        )
        .with_command("Get-WindowsOptionalFeature -Online | Where-Object {$_.State -eq 'Enabled' -and $_.FeatureName -notmatch 'NetFx|Media|Print' } | Disable-WindowsOptionalFeature -Online".to_string())
        .with_suggestions(vec![
            "Review enabled Windows features".to_string(),
            "Disable unused features like Telnet, TFTP, etc.".to_string(),
            "Keep only necessary components".to_string(),
        ])
        .with_impact("low".to_string())
        .with_time("15 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Configure Windows Password Policy".to_string(),
            "Enforce strong password requirements".to_string(),
            "password-policy".to_string(),
            "high".to_string(),
            vec!["windows".to_string()],
        )
        .with_command("net accounts /minpwlen:12 /maxpwage:90 /minpwage:1 /uniquepw:5".to_string())
        .with_suggestions(vec![
            "Set minimum password length to 12 characters".to_string(),
            "Require password complexity".to_string(),
            "Set maximum password age to 90 days".to_string(),
            "Enforce password history".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("5 minutes".to_string()),
    ]
}

fn get_macos_tasks() -> Vec<HardeningTask> {
    vec![
        HardeningTask::new(
            generate_id(),
            "Enable FileVault Encryption".to_string(),
            "Encrypt the startup disk to protect data at rest".to_string(),
            "encryption".to_string(),
            "critical".to_string(),
            vec!["macos".to_string()],
        )
        .with_command("sudo fdesetup enable".to_string())
        .with_suggestions(vec![
            "Enable FileVault from System Preferences > Security & Privacy".to_string(),
            "Store recovery key securely (not on the same device)".to_string(),
            "Allow iCloud recovery key if desired".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("30 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Enable Firewall".to_string(),
            "Configure macOS built-in firewall".to_string(),
            "firewall".to_string(),
            "critical".to_string(),
            vec!["macos".to_string()],
        )
        .with_command("sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on".to_string())
        .with_suggestions(vec![
            "Enable firewall: System Preferences > Security & Privacy > Firewall".to_string(),
            "Set to block all incoming connections by default".to_string(),
            "Allow only necessary applications".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("5 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Enable Gatekeeper".to_string(),
            "Ensure Gatekeeper is enabled to prevent unsigned apps".to_string(),
            "access-control".to_string(),
            "high".to_string(),
            vec!["macos".to_string()],
        )
        .with_command("sudo spctl --master-enable".to_string())
        .with_suggestions(vec![
            "Enable Gatekeeper: sudo spctl --master-enable".to_string(),
            "Set to allow apps from App Store and identified developers".to_string(),
            "Review System Preferences > Security & Privacy".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("2 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Disable Remote Login (SSH)".to_string(),
            "Disable SSH access if not needed".to_string(),
            "remote-access".to_string(),
            "high".to_string(),
            vec!["macos".to_string()],
        )
        .with_command("sudo systemsetup -setremotelogin off".to_string())
        .with_suggestions(vec![
            "Disable Remote Login: System Preferences > Sharing".to_string(),
            "If needed, use key-based authentication only".to_string(),
            "Disable root login".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("2 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Enable Automatic Updates".to_string(),
            "Configure automatic installation of macOS updates".to_string(),
            "updates".to_string(),
            "high".to_string(),
            vec!["macos".to_string()],
        )
        .with_command("sudo defaults write /Library/Preferences/com.apple.SoftwareUpdate AutomaticCheckEnabled -bool true".to_string())
        .with_suggestions(vec![
            "Enable automatic updates: System Preferences > Software Update".to_string(),
            "Enable automatic download and installation".to_string(),
            "Check for updates daily".to_string(),
        ])
        .with_impact("medium".to_string())
        .with_time("5 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Disable Guest Account".to_string(),
            "Prevent unauthorized access via guest account".to_string(),
            "access-control".to_string(),
            "medium".to_string(),
            vec!["macos".to_string()],
        )
        .with_command("sudo defaults write /Library/Preferences/com.apple.loginwindow GuestEnabled -bool false".to_string())
        .with_suggestions(vec![
            "Disable guest account: System Preferences > Users & Groups".to_string(),
            "Remove guest access to shared folders".to_string(),
        ])
        .with_impact("medium".to_string())
        .with_time("2 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Enable System Integrity Protection (SIP)".to_string(),
            "Ensure SIP is enabled to protect system files".to_string(),
            "access-control".to_string(),
            "critical".to_string(),
            vec!["macos".to_string()],
        )
        .with_command("csrutil status".to_string())
        .with_manual_steps(vec![
            "Check SIP status: csrutil status".to_string(),
            "If disabled, boot into Recovery Mode".to_string(),
            "Enable SIP: csrutil enable".to_string(),
            "Reboot system".to_string(),
        ])
        .with_suggestions(vec![
            "Verify SIP is enabled: csrutil status".to_string(),
            "SIP should be enabled by default on modern macOS".to_string(),
            "Only disable if absolutely necessary for specific software".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("10 minutes".to_string())
        .with_reboot(true),

        HardeningTask::new(
            generate_id(),
            "Configure Screen Saver Password".to_string(),
            "Require password immediately after screen saver starts".to_string(),
            "access-control".to_string(),
            "medium".to_string(),
            vec!["macos".to_string()],
        )
        .with_command("defaults write com.apple.screensaver askForPassword -int 1 && defaults write com.apple.screensaver askForPasswordDelay -int 0".to_string())
        .with_suggestions(vec![
            "Require password immediately: System Preferences > Security & Privacy".to_string(),
            "Set screen saver to activate after short idle time".to_string(),
        ])
        .with_impact("medium".to_string())
        .with_time("2 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Disable Automatic Login".to_string(),
            "Require user login on startup".to_string(),
            "access-control".to_string(),
            "medium".to_string(),
            vec!["macos".to_string()],
        )
        .with_command("sudo defaults delete /Library/Preferences/com.apple.loginwindow autoLoginUser 2>/dev/null || true".to_string())
        .with_suggestions(vec![
            "Disable automatic login: System Preferences > Users & Groups".to_string(),
            "Require password on wake from sleep".to_string(),
        ])
        .with_impact("medium".to_string())
        .with_time("2 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Enable Location Services Privacy".to_string(),
            "Review and restrict location access for applications".to_string(),
            "privacy".to_string(),
            "low".to_string(),
            vec!["macos".to_string()],
        )
        .with_command("defaults write com.apple.locationd LocationServicesEnabled -bool true".to_string())
        .with_suggestions(vec![
            "Review location services: System Preferences > Security & Privacy > Privacy".to_string(),
            "Disable location access for unnecessary apps".to_string(),
            "Use location services only when needed".to_string(),
        ])
        .with_impact("low".to_string())
        .with_time("10 minutes".to_string()),
    ]
}

fn get_cross_platform_tasks() -> Vec<HardeningTask> {
    vec![
        HardeningTask::new(
            generate_id(),
            "Enable Two-Factor Authentication".to_string(),
            "Add an extra layer of security to user accounts".to_string(),
            "authentication".to_string(),
            "high".to_string(),
            vec!["linux".to_string(), "windows".to_string(), "macos".to_string()],
        )
        .with_suggestions(vec![
            "Enable 2FA for all user accounts".to_string(),
            "Use authenticator apps (Google Authenticator, Authy)".to_string(),
            "Store backup codes securely".to_string(),
            "Enable 2FA for SSH (Linux)".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("15 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Review and Remove Unused Software".to_string(),
            "Uninstall unnecessary applications to reduce attack surface".to_string(),
            "software".to_string(),
            "medium".to_string(),
            vec!["linux".to_string(), "windows".to_string(), "macos".to_string()],
        )
        .with_suggestions(vec![
            "Audit installed software regularly".to_string(),
            "Remove unused applications".to_string(),
            "Keep software updated".to_string(),
        ])
        .with_impact("low".to_string())
        .with_time("30 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Configure Strong Password Policy".to_string(),
            "Enforce complex passwords for all accounts".to_string(),
            "password-policy".to_string(),
            "high".to_string(),
            vec!["linux".to_string(), "windows".to_string(), "macos".to_string()],
        )
        .with_suggestions(vec![
            "Set minimum password length (12+ characters)".to_string(),
            "Require complexity (uppercase, lowercase, numbers, symbols)".to_string(),
            "Enforce password expiration".to_string(),
            "Prevent password reuse".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("10 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Enable Full Disk Encryption".to_string(),
            "Encrypt entire disk to protect data at rest".to_string(),
            "encryption".to_string(),
            "critical".to_string(),
            vec!["linux".to_string(), "windows".to_string(), "macos".to_string()],
        )
        .with_suggestions(vec![
            "Linux: Use LUKS encryption".to_string(),
            "Windows: Enable BitLocker".to_string(),
            "macOS: Enable FileVault".to_string(),
            "Store recovery keys securely".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("30 minutes".to_string()),

        HardeningTask::new(
            generate_id(),
            "Configure Secure Backup Strategy".to_string(),
            "Set up encrypted backups with versioning".to_string(),
            "backup".to_string(),
            "high".to_string(),
            vec!["linux".to_string(), "windows".to_string(), "macos".to_string()],
        )
        .with_suggestions(vec![
            "Use encrypted backup solutions".to_string(),
            "Follow 3-2-1 backup rule (3 copies, 2 media types, 1 offsite)".to_string(),
            "Test backup restoration regularly".to_string(),
            "Automate backup schedules".to_string(),
        ])
        .with_impact("high".to_string())
        .with_time("1 hour".to_string()),
    ]
}

fn generate_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("hardening_{}", timestamp)
}

