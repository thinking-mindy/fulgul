use crate::hardening::tasks::HardeningTask;
use crate::command::{program, powershell_sync};

pub fn detect_os() -> String {
    if cfg!(target_os = "linux") {
        "linux".to_string()
    } else if cfg!(target_os = "windows") {
        "windows".to_string()
    } else if cfg!(target_os = "macos") {
        "macos".to_string()
    } else {
        "unknown".to_string()
    }
}

pub async fn check_task_status(task: &HardeningTask) -> String {
    let os = detect_os();
    
    // Check if task is applicable to current OS
    if !task.platform.contains(&os) && !task.platform.contains(&"all".to_string()) {
        return "not-applicable".to_string();
    }

    // Platform-specific checks
    match os.as_str() {
        "linux" => check_linux_task(task).await,
        "windows" => check_windows_task(task).await,
        "macos" => check_macos_task(task).await,
        _ => "unknown".to_string(),
    }
}

async fn check_linux_task(task: &HardeningTask) -> String {
    match task.category.as_str() {
        "ssh" => {
            if task.name.contains("Root SSH") {
                // Check if PermitRootLogin is set to no
                let output = program("grep")
                    .arg("PermitRootLogin")
                    .arg("/etc/ssh/sshd_config")
                    .output()
                    .ok();
                
                if let Some(output) = output {
                    let content = String::from_utf8_lossy(&output.stdout);
                    if content.contains("PermitRootLogin no") {
                        return "completed".to_string();
                    }
                }
                "pending".to_string()
            } else if task.name.contains("Harden SSH") {
                // Check SSH config
                let output = program("grep")
                    .arg("PasswordAuthentication")
                    .arg("/etc/ssh/sshd_config")
                    .output()
                    .ok();
                
                if let Some(output) = output {
                    let content = String::from_utf8_lossy(&output.stdout);
                    if content.contains("PasswordAuthentication no") {
                        return "completed".to_string();
                    }
                }
                "pending".to_string()
            } else {
                "pending".to_string()
            }
        }
        "firewall" => {
            // Check if UFW is enabled
            let output = program("ufw")
                .arg("status")
                .output()
                .ok();
            
            if let Some(output) = output {
                let content = String::from_utf8_lossy(&output.stdout);
                if content.contains("Status: active") {
                    return "completed".to_string();
                }
            }
            "pending".to_string()
        }
        "updates" => {
            // Check if unattended-upgrades is installed
            let output = program("dpkg")
                .arg("-l")
                .arg("unattended-upgrades")
                .output()
                .ok();
            
            if let Some(output) = output {
                let content = String::from_utf8_lossy(&output.stdout);
                if content.contains("unattended-upgrades") {
                    return "completed".to_string();
                }
            }
            "pending".to_string()
        }
        "intrusion-detection" => {
            // Check if fail2ban is running
            let output = program("systemctl")
                .arg("is-active")
                .arg("fail2ban")
                .output()
                .ok();
            
            if let Some(output) = output {
                let content = String::from_utf8_lossy(&output.stdout);
                if content.trim() == "active" {
                    return "completed".to_string();
                }
            }
            "pending".to_string()
        }
        _ => "pending".to_string(),
    }
}

async fn check_windows_task(task: &HardeningTask) -> String {
    match task.category.as_str() {
        "firewall" => {
            // Check Windows Firewall status using PowerShell
            let output = powershell_sync(
                "Get-NetFirewallProfile | Select-Object -ExpandProperty Enabled",
            )
                .output()
                .ok();
            
            if let Some(output) = output {
                let content = String::from_utf8_lossy(&output.stdout);
                if content.contains("True") {
                    return "completed".to_string();
                }
            }
            "pending".to_string()
        }
        "antivirus" => {
            // Check Windows Defender status
            let output = powershell_sync(
                "Get-MpComputerStatus | Select-Object -ExpandProperty RealTimeProtectionEnabled",
            )
                .output()
                .ok();
            
            if let Some(output) = output {
                let content = String::from_utf8_lossy(&output.stdout);
                if content.contains("True") {
                    return "completed".to_string();
                }
            }
            "pending".to_string()
        }
        "encryption" => {
            // Check BitLocker status
            let output = program("manage-bde")
                .arg("-status")
                .arg("C:")
                .output()
                .ok();
            
            if let Some(output) = output {
                let content = String::from_utf8_lossy(&output.stdout);
                if content.contains("Encryption in Progress") || content.contains("Fully Encrypted") {
                    return "completed".to_string();
                }
            }
            "pending".to_string()
        }
        _ => "pending".to_string(),
    }
}

async fn check_macos_task(task: &HardeningTask) -> String {
    match task.category.as_str() {
        "encryption" => {
            // Check FileVault status
            let output = program("fdesetup")
                .arg("status")
                .output()
                .ok();
            
            if let Some(output) = output {
                let content = String::from_utf8_lossy(&output.stdout);
                if content.contains("FileVault is On") {
                    return "completed".to_string();
                }
            }
            "pending".to_string()
        }
        "firewall" => {
            // Check macOS firewall status
            let output = program("/usr/libexec/ApplicationFirewall/socketfilterfw")
                .arg("--getglobalstate")
                .output()
                .ok();
            
            if let Some(output) = output {
                let content = String::from_utf8_lossy(&output.stdout);
                if content.contains("enabled") {
                    return "completed".to_string();
                }
            }
            "pending".to_string()
        }
        "access-control" => {
            if task.name.contains("Gatekeeper") {
                // Check Gatekeeper status
                let output = program("spctl")
                    .arg("--status")
                    .output()
                    .ok();
                
                if let Some(output) = output {
                    let content = String::from_utf8_lossy(&output.stdout);
                    if content.contains("enabled") {
                        return "completed".to_string();
                    }
                }
            }
            "pending".to_string()
        }
        _ => "pending".to_string(),
    }
}

pub async fn get_applicable_tasks() -> Vec<HardeningTask> {
    let os = detect_os();
    let all_tasks = crate::hardening::tasks::get_all_hardening_tasks();
    
    all_tasks
        .into_iter()
        .filter(|task| {
            task.platform.contains(&os) || task.platform.contains(&"all".to_string())
        })
        .collect()
}

pub async fn check_all_tasks() -> Vec<HardeningTask> {
    let mut tasks = get_applicable_tasks().await;
    
    // Check status for each task
    for task in &mut tasks {
        let status = check_task_status(task).await;
        task.status = status;
    }
    
    tasks
}

