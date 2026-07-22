use crate::commands::Vulnerability;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
struct FixDatabase {
    fixes: HashMap<String, FixSuggestion>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FixSuggestion {
    pub title: String,
    pub description: String,
    pub command: Option<String>,
    #[serde(rename = "manualSteps")]
    pub manual_steps: Vec<String>,
    #[serde(rename = "autoFixable")]
    pub auto_fixable: bool,
}

pub fn get_fix_suggestion(vuln: &Vulnerability) -> FixSuggestion {
    // Match vulnerability patterns to suggest fixes
    let title_lower = vuln.title.to_lowercase();
    let desc_lower = vuln.description.to_lowercase();

    // Outdated packages
    if title_lower.contains("outdated") || title_lower.contains("package") {
        #[cfg(target_os = "linux")]
        {
            return FixSuggestion {
                title: "Update System Packages".to_string(),
                description: "Update all outdated packages to their latest versions".to_string(),
                command: Some("sudo apt update && sudo apt upgrade -y".to_string()),
                manual_steps: vec![
                    "Run: sudo apt update".to_string(),
                    "Review available updates: sudo apt list --upgradable".to_string(),
                    "Apply updates: sudo apt upgrade -y".to_string(),
                ],
                auto_fixable: true,
            };
        }
        #[cfg(target_os = "windows")]
        {
            return FixSuggestion {
                title: "Update System Packages".to_string(),
                description: "Update all outdated packages using winget".to_string(),
                command: Some("winget upgrade --all".to_string()),
                manual_steps: vec![
                    "Open PowerShell as Administrator".to_string(),
                    "Run: winget upgrade --all".to_string(),
                    "Review and confirm updates".to_string(),
                ],
                auto_fixable: true,
            };
        }
        #[cfg(target_os = "macos")]
        {
            return FixSuggestion {
                title: "Update System Packages".to_string(),
                description: "Update all outdated packages using Homebrew".to_string(),
                command: Some("brew upgrade".to_string()),
                manual_steps: vec![
                    "Run: brew update".to_string(),
                    "Check outdated: brew outdated".to_string(),
                    "Update: brew upgrade".to_string(),
                ],
                auto_fixable: true,
            };
        }
    }

    // Firewall issues
    if title_lower.contains("firewall") || desc_lower.contains("firewall") {
        #[cfg(target_os = "linux")]
        {
            return FixSuggestion {
                title: "Enable Firewall".to_string(),
                description: "Activate the system firewall for protection".to_string(),
                command: Some("sudo ufw enable".to_string()),
                manual_steps: vec![
                    "Check firewall status: sudo ufw status".to_string(),
                    "Enable firewall: sudo ufw enable".to_string(),
                    "Verify: sudo ufw status verbose".to_string(),
                ],
                auto_fixable: true,
            };
        }
        #[cfg(target_os = "windows")]
        {
            return FixSuggestion {
                title: "Enable Windows Firewall".to_string(),
                description: "Enable Windows Firewall through PowerShell".to_string(),
                command: Some("Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True".to_string()),
                manual_steps: vec![
                    "Open PowerShell as Administrator".to_string(),
                    "Run: Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True".to_string(),
                    "Verify: Get-NetFirewallProfile".to_string(),
                ],
                auto_fixable: true,
            };
        }
    }

    // SSH configuration
    if title_lower.contains("ssh") {
        return FixSuggestion {
            title: "Secure SSH Configuration".to_string(),
            description: "Update SSH configuration to improve security".to_string(),
            command: None,
            manual_steps: vec![
                "Edit /etc/ssh/sshd_config".to_string(),
                "Set PermitRootLogin no".to_string(),
                "Set PasswordAuthentication no (use keys only)".to_string(),
                "Restart SSH: sudo systemctl restart sshd".to_string(),
            ],
            auto_fixable: false,
        };
    }

    // File permissions
    if title_lower.contains("permission") || desc_lower.contains("permission") {
        return FixSuggestion {
            title: "Fix File Permissions".to_string(),
            description: "Correct insecure file permissions".to_string(),
            command: None,
            manual_steps: vec![
                "Identify the file with incorrect permissions".to_string(),
                "Set appropriate permissions: chmod 600 for private keys".to_string(),
                "Verify: ls -l <file>".to_string(),
            ],
            auto_fixable: false,
        };
    }

    // Dangerous ports
    if title_lower.contains("port") || desc_lower.contains("port") {
        return FixSuggestion {
            title: "Close Dangerous Port".to_string(),
            description: "Close or restrict access to the exposed port".to_string(),
            command: None,
            manual_steps: vec![
                "Identify the service using the port".to_string(),
                "Stop the service or configure firewall rules".to_string(),
                "Block the port: sudo ufw deny <port>".to_string(),
            ],
            auto_fixable: false,
        };
    }

    // Default fix suggestion
    FixSuggestion {
        title: "Review and Remediate".to_string(),
        description: vuln.remediation.clone(),
        command: None,
        manual_steps: vec![
            "Review the vulnerability details".to_string(),
            "Follow the remediation steps provided".to_string(),
            "Verify the fix was applied correctly".to_string(),
        ],
        auto_fixable: false,
    }
}

pub async fn apply_auto_fix(vuln: &Vulnerability) -> Result<String, String> {
    let fix = get_fix_suggestion(vuln);

    if !fix.auto_fixable {
        return Err("This vulnerability cannot be auto-fixed. Manual intervention required.".to_string());
    }

    if let Some(cmd) = fix.command {
        #[cfg(target_os = "linux")]
        {
            let output = crate::command::shell_sync(&cmd)
                .output()
                .map_err(|e| format!("Failed to execute fix command: {e}"))?;

            if output.status.success() {
                return Ok("Fix applied successfully".to_string());
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Fix command failed: {}", stderr));
            }
        }
        #[cfg(target_os = "windows")]
        {
            let output = if cmd.starts_with("Set-Net") || cmd.starts_with("Get-Net") {
                crate::command::powershell_sync(&cmd)
            } else {
                crate::command::shell_sync(&cmd)
            }
            .output()
            .map_err(|e| format!("Failed to execute fix command: {e}"))?;

            if output.status.success() {
                return Ok("Fix applied successfully".to_string());
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Fix command failed: {}", stderr));
            }
        }
        #[cfg(target_os = "macos")]
        {
            let output = crate::command::shell_sync(&cmd)
                .output()
                .map_err(|e| format!("Failed to execute fix command: {e}"))?;

            if output.status.success() {
                return Ok("Fix applied successfully".to_string());
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Fix command failed: {}", stderr));
            }
        }
        #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
        {
            return Err("Unsupported operating system".to_string());
        }
    } else {
        Err("No auto-fix command available".to_string())
    }
}

