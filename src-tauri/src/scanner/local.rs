use crate::commands::{ScanResult, Vulnerability};
use crate::command::{program, powershell_sync};
use crate::scanner::checks::{generate_scan_id, make_vuln, vulns_from_open_ports};
use crate::scanner::local_extra::run_extended_local_checks;
use crate::scanner::probes::probe_open_ports;
use crate::scanner::utils::{calculate_security_score, get_system_info};
use std::str;

pub async fn scan_local_machine() -> Result<ScanResult, String> {
    let system_info = get_system_info();
    let timestamp = chrono::Utc::now().to_rfc3339();

    // Collect vulnerabilities
    let mut vulnerabilities = Vec::new();

    // Check for outdated packages
    let outdated = check_outdated_packages().await;
    vulnerabilities.extend(outdated);

    // Check file permissions
    let permission_issues = check_file_permissions().await;
    vulnerabilities.extend(permission_issues);

    // Check firewall status
    let firewall_issues = check_firewall_status().await;
    vulnerabilities.extend(firewall_issues);

    // Check open ports
    let open_ports = get_open_ports().await?;
    vulnerabilities.extend(vulns_from_open_ports(&open_ports, "Local System"));

    // Banner / protocol probes against localhost services
    vulnerabilities.extend(probe_open_ports("127.0.0.1", &open_ports, "Local System").await);

    // Extended host checks (SUID, docker.sock, versions, NFS, etc.)
    vulnerabilities.extend(run_extended_local_checks().await);

    // Check SSH configuration
    let ssh_issues = check_ssh_config().await;
    vulnerabilities.extend(ssh_issues);

    let outdated_count = vulnerabilities
        .iter()
        .filter(|v| v.title.contains("outdated") || v.title.contains("package"))
        .count();

    let security_score = calculate_security_score(&vulnerabilities, &open_ports, outdated_count);

    Ok(ScanResult {
        id: generate_scan_id(),
        os: format!("{} ({})", system_info.os, system_info.kernel),
        timestamp,
        vulnerabilities,
        open_ports,
        services: Some(get_running_services().await),
        security_score: security_score.score,
        security_grade: security_score.grade,
    })
}

async fn check_outdated_packages() -> Vec<Vulnerability> {
    #[allow(unused_mut)]
    let mut vulns = Vec::new();

    #[cfg(target_os = "linux")]
    {
        
        // Check for outdated packages on Debian/Ubuntu
        if let Ok(output) = program("apt")
            .args(["list", "--upgradable"])
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                let lines: Vec<&str> = stdout.lines().skip(1).collect();
                if lines.len() > 1 {
                    vulns.push(Vulnerability {
                        id: generate_scan_id(),
                        title: format!("{} outdated packages found", lines.len() - 1),
                        description: "System has outdated packages that may contain security vulnerabilities.".to_string(),
                        severity: if lines.len() > 50 { "High".to_string() } else { "Medium".to_string() },
                        cve: None,
                        affected_systems: vec!["Local System".to_string()],
                        detected_at: chrono::Utc::now().to_rfc3339(),
                        remediation: "Run 'sudo apt update && sudo apt upgrade' to update packages.".to_string(),
                    });
                }
            }
        }

        // Check for Arch Linux
        if let Ok(output) = program("pacman")
            .args(["-Qu"])
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                let count = stdout.lines().count();
                if count > 0 {
                    vulns.push(Vulnerability {
                        id: generate_scan_id(),
                        title: format!("{} outdated packages found", count),
                        description: "System has outdated packages that may contain security vulnerabilities.".to_string(),
                        severity: if count > 50 { "High".to_string() } else { "Medium".to_string() },
                        cve: None,
                        affected_systems: vec!["Local System".to_string()],
                        detected_at: chrono::Utc::now().to_rfc3339(),
                        remediation: "Run 'sudo pacman -Syu' to update packages.".to_string(),
                    });
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        
        // Check with winget
        if let Ok(output) = program("winget")
            .args(["upgrade", "--list"])
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                let count = stdout.lines().filter(|l| l.contains("---")).count();
                if count > 0 {
                    vulns.push(Vulnerability {
                        id: generate_scan_id(),
                        title: format!("{} outdated packages found", count),
                        description: "System has outdated packages that may contain security vulnerabilities.".to_string(),
                        severity: if count > 50 { "High".to_string() } else { "Medium".to_string() },
                        cve: None,
                        affected_systems: vec!["Local System".to_string()],
                        detected_at: chrono::Utc::now().to_rfc3339(),
                        remediation: "Run 'winget upgrade --all' to update packages.".to_string(),
                    });
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        
        // Check with Homebrew
        if let Ok(output) = program("brew")
            .args(["outdated"])
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                let count = stdout.lines().count();
                if count > 0 {
                    vulns.push(Vulnerability {
                        id: generate_scan_id(),
                        title: format!("{} outdated packages found", count),
                        description: "System has outdated packages that may contain security vulnerabilities.".to_string(),
                        severity: if count > 50 { "High".to_string() } else { "Medium".to_string() },
                        cve: None,
                        affected_systems: vec!["Local System".to_string()],
                        detected_at: chrono::Utc::now().to_rfc3339(),
                        remediation: "Run 'brew upgrade' to update packages.".to_string(),
                    });
                }
            }
        }
    }

    vulns
}

async fn check_file_permissions() -> Vec<Vulnerability> {
    #[allow(unused_mut)]
    let mut vulns = Vec::new();

    #[cfg(target_os = "linux")]
    {
        // Check /etc/shadow permissions
        if let Ok(metadata) = std::fs::metadata("/etc/shadow") {
            let perms = metadata.permissions();
            if perms.readonly() == false {
                vulns.push(Vulnerability {
                    id: generate_scan_id(),
                    title: "Insecure /etc/shadow permissions".to_string(),
                    description: "/etc/shadow file has incorrect permissions.".to_string(),
                    severity: "High".to_string(),
                    cve: None,
                    affected_systems: vec!["Local System".to_string()],
                    detected_at: chrono::Utc::now().to_rfc3339(),
                    remediation: "Ensure /etc/shadow has 640 permissions and root:shadow ownership.".to_string(),
                });
            }
        }

        // Check SSH key permissions
        if let Ok(entries) = std::fs::read_dir(std::path::Path::new(&format!("{}/.ssh", std::env::var("HOME").unwrap_or_default()))) {
            for entry in entries.flatten() {
                if let Some(name) = entry.file_name().to_str() {
                    if name.ends_with("_rsa") || name.ends_with("_dsa") || name.ends_with("_ecdsa") {
                        if let Ok(metadata) = entry.metadata() {
                            let perms = metadata.permissions();
                            // Check if permissions are too open (should be 600)
                            if perms.readonly() == false {
                                vulns.push(Vulnerability {
                                    id: generate_scan_id(),
                                    title: format!("Insecure SSH key permissions: {}", name),
                                    description: format!("SSH private key {} has incorrect permissions.", name),
                                    severity: "Medium".to_string(),
                                    cve: None,
                                    affected_systems: vec!["Local System".to_string()],
                                    detected_at: chrono::Utc::now().to_rfc3339(),
                                    remediation: format!("Run 'chmod 600 {}' to secure the key.", name),
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    vulns
}

async fn check_firewall_status() -> Vec<Vulnerability> {
    #[allow(unused_mut)]
    let mut vulns = Vec::new();

    #[cfg(target_os = "linux")]
    {
        
        // Check UFW
        if let Ok(output) = program("ufw")
            .arg("status")
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                if stdout.contains("inactive") {
                    vulns.push(Vulnerability {
                        id: generate_scan_id(),
                        title: "Firewall is inactive".to_string(),
                        description: "UFW firewall is not active, leaving system exposed.".to_string(),
                        severity: "High".to_string(),
                        cve: None,
                        affected_systems: vec!["Local System".to_string()],
                        detected_at: chrono::Utc::now().to_rfc3339(),
                        remediation: "Run 'sudo ufw enable' to activate the firewall.".to_string(),
                    });
                }
            }
        }

        // Check firewalld
        if let Ok(output) = program("firewall-cmd")
            .arg("--state")
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                if stdout.contains("not running") {
                    vulns.push(Vulnerability {
                        id: generate_scan_id(),
                        title: "Firewall is inactive".to_string(),
                        description: "Firewalld is not running, leaving system exposed.".to_string(),
                        severity: "High".to_string(),
                        cve: None,
                        affected_systems: vec!["Local System".to_string()],
                        detected_at: chrono::Utc::now().to_rfc3339(),
                        remediation: "Run 'sudo systemctl start firewalld' to start the firewall.".to_string(),
                    });
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        
        // Check Windows Firewall
        if let Ok(output) = powershell_sync(
            "Get-NetFirewallProfile | Select-Object -ExpandProperty Enabled",
        )
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                if stdout.contains("False") {
                    vulns.push(Vulnerability {
                        id: generate_scan_id(),
                        title: "Windows Firewall is disabled".to_string(),
                        description: "Windows Firewall is not active on one or more profiles.".to_string(),
                        severity: "High".to_string(),
                        cve: None,
                        affected_systems: vec!["Local System".to_string()],
                        detected_at: chrono::Utc::now().to_rfc3339(),
                        remediation: "Enable Windows Firewall through Control Panel or PowerShell.".to_string(),
                    });
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        
        // Check pfctl (macOS firewall)
        if let Ok(output) = program("defaults")
            .args(["read", "/Library/Preferences/com.apple.alf", "globalstate"])
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                if stdout.trim() == "0" {
                    vulns.push(Vulnerability {
                        id: generate_scan_id(),
                        title: "macOS Firewall is disabled".to_string(),
                        description: "macOS firewall is not active.".to_string(),
                        severity: "High".to_string(),
                        cve: None,
                        affected_systems: vec!["Local System".to_string()],
                        detected_at: chrono::Utc::now().to_rfc3339(),
                        remediation: "Enable firewall in System Preferences > Security & Privacy.".to_string(),
                    });
                }
            }
        }
    }

    vulns
}

async fn get_open_ports() -> Result<Vec<u16>, String> {
    let mut ports = Vec::new();

    #[cfg(target_os = "linux")]
    {
        
        // Use ss command
        if let Ok(output) = program("ss")
            .args(["-tuln"])
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                for line in stdout.lines().skip(1) {
                    if let Some(port_part) = line.split_whitespace().nth(4) {
                        if let Some(port_str) = port_part.split(':').last() {
                            if let Ok(port) = port_str.parse::<u16>() {
                                ports.push(port);
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        
        // Use netstat
        if let Ok(output) = program("netstat")
            .args(["-ano"])
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                for line in stdout.lines().skip(4) {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 2 {
                        if let Some(addr) = parts.get(1) {
                            if let Some(port_str) = addr.split(':').last() {
                                if let Ok(port) = port_str.parse::<u16>() {
                                    ports.push(port);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        
        // Use lsof
        if let Ok(output) = program("lsof")
            .args(["-i", "-P", "-n"])
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                for line in stdout.lines().skip(1) {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if parts.len() >= 9 {
                        if let Some(port_part) = parts.get(8) {
                            if let Some(port_str) = port_part.split(':').last() {
                                if let Ok(port) = port_str.parse::<u16>() {
                                    ports.push(port);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    ports.sort();
    ports.dedup();
    Ok(ports)
}

async fn check_ssh_config() -> Vec<Vulnerability> {
    #[allow(unused_mut)]
    let mut vulns = Vec::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(contents) = std::fs::read_to_string("/etc/ssh/sshd_config") {
            for line in contents.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with('#') || trimmed.is_empty() {
                    continue;
                }
                let lower = trimmed.to_lowercase();
                if lower.starts_with("permitrootlogin") && lower.contains("yes") {
                    vulns.push(make_vuln(
                        "SSH root login enabled",
                        "sshd_config allows direct root login.",
                        "high",
                        "Set PermitRootLogin no and use sudo.",
                        "Local System",
                        None,
                    ));
                }
                if lower.starts_with("passwordauthentication yes") {
                    vulns.push(make_vuln(
                        "SSH password authentication enabled",
                        "Password-based SSH logins are enabled.",
                        "medium",
                        "Disable PasswordAuthentication and use SSH keys.",
                        "Local System",
                        None,
                    ));
                }
                if lower.starts_with("permitemptypasswords yes") {
                    vulns.push(make_vuln(
                        "SSH permits empty passwords",
                        "PermitEmptyPasswords is enabled.",
                        "critical",
                        "Set PermitEmptyPasswords no.",
                        "Local System",
                        None,
                    ));
                }
            }
        }
    }

    vulns
}

async fn get_running_services() -> Vec<String> {
    #[allow(unused_mut)]
    let mut result: Vec<String> = Vec::new();

    #[cfg(target_os = "linux")]
    {
        
        if let Ok(output) = program("systemctl")
            .args(["--type=service", "--state=running", "--no-pager", "--no-legend"])
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                for line in stdout.lines() {
                    if let Some(service) = line.split_whitespace().next() {
                        result.push(service.to_string());
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        
        if let Ok(output) = powershell_sync(
            "Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object -ExpandProperty Name",
        )
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                for line in stdout.lines() {
                    let trimmed = line.trim();
                    if !trimmed.is_empty() {
                        result.push(trimmed.to_string());
                    }
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        
        if let Ok(output) = program("launchctl")
            .args(["list"])
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                for line in stdout.lines().skip(1) {
                    if let Some(service) = line.split_whitespace().nth(2) {
                        result.push(service.to_string());
                    }
                }
            }
        }
    }

    result
}

