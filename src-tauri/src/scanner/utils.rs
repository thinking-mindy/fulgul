use serde::{Deserialize, Serialize};
use std::str;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SystemInfo {
    pub os: String,
    pub kernel: String,
    pub hostname: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SecurityScore {
    pub score: u32,
    pub grade: String,
}

pub fn calculate_security_score(
    vulnerabilities: &[crate::commands::Vulnerability],
    open_ports: &[u16],
    outdated_packages: usize,
) -> SecurityScore {
    let mut score = 100u32;

    // Deduct points for vulnerabilities
    for vuln in vulnerabilities {
        let sev = vuln.severity.to_lowercase();
        match sev.as_str() {
            "critical" => score = score.saturating_sub(20),
            "high" => score = score.saturating_sub(12),
            "medium" => score = score.saturating_sub(6),
            "low" => score = score.saturating_sub(2),
            _ => score = score.saturating_sub(1),
        }
    }

    // Deduct for dangerous open ports
    let dangerous_ports = [
        21, 23, 69, 111, 135, 139, 161, 445, 512, 513, 514, 1433, 1521, 2049, 2375, 3306, 3389,
        4444, 5432, 5900, 6379, 9200, 11211, 27017,
    ];
    for port in open_ports {
        if dangerous_ports.contains(port) {
            score = score.saturating_sub(5);
        }
    }

    // Deduct for outdated packages
    score = score.saturating_sub((outdated_packages.min(20) as u32) * 2);

    let grade = match score {
        90..=100 => "Excellent",
        70..=89 => "Good",
        50..=69 => "Moderate",
        30..=49 => "Risky",
        _ => "Critical",
    }
    .to_string();

    SecurityScore { score, grade }
}

pub fn get_system_info() -> SystemInfo {
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        let os = Command::new("uname")
            .arg("-o")
            .output()
            .ok()
            .and_then(|o| str::from_utf8(&o.stdout).ok().map(|s| s.trim().to_string()))
            .unwrap_or_else(|| "Linux".to_string());

        let kernel = Command::new("uname")
            .arg("-r")
            .output()
            .ok()
            .and_then(|o| str::from_utf8(&o.stdout).ok().map(|s| s.trim().to_string()))
            .unwrap_or_else(|| "Unknown".to_string());

        let hostname = Command::new("hostname")
            .output()
            .ok()
            .and_then(|o| str::from_utf8(&o.stdout).ok().map(|s| s.trim().to_string()))
            .unwrap_or_else(|| "Unknown".to_string());

        return SystemInfo {
            os,
            kernel,
            hostname,
        };
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let os = Command::new("cmd")
            .args(["/C", "ver"])
            .output()
            .ok()
            .and_then(|o| str::from_utf8(&o.stdout).ok().map(|s| s.trim().to_string()))
            .unwrap_or_else(|| "Windows".to_string());

        let kernel = Command::new("cmd")
            .args(["/C", "systeminfo | findstr /B /C:\"OS Version\""])
            .output()
            .ok()
            .and_then(|o| str::from_utf8(&o.stdout).ok().map(|s| s.trim().to_string()))
            .unwrap_or_else(|| "Unknown".to_string());

        let hostname = Command::new("cmd")
            .args(["/C", "hostname"])
            .output()
            .ok()
            .and_then(|o| str::from_utf8(&o.stdout).ok().map(|s| s.trim().to_string()))
            .unwrap_or_else(|| "Unknown".to_string());

        return SystemInfo {
            os,
            kernel,
            hostname,
        };
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        let os = Command::new("sw_vers")
            .arg("-productName")
            .output()
            .ok()
            .and_then(|o| str::from_utf8(&o.stdout).ok().map(|s| s.trim().to_string()))
            .unwrap_or_else(|| "macOS".to_string());

        let kernel = Command::new("uname")
            .arg("-r")
            .output()
            .ok()
            .and_then(|o| str::from_utf8(&o.stdout).ok().map(|s| s.trim().to_string()))
            .unwrap_or_else(|| "Unknown".to_string());

        let hostname = Command::new("hostname")
            .output()
            .ok()
            .and_then(|o| str::from_utf8(&o.stdout).ok().map(|s| s.trim().to_string()))
            .unwrap_or_else(|| "Unknown".to_string());

        return SystemInfo {
            os,
            kernel,
            hostname,
        };
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        SystemInfo {
            os: "Unknown".to_string(),
            kernel: "Unknown".to_string(),
            hostname: "Unknown".to_string(),
        }
    }
}

pub fn is_private_ip(ip: &str) -> bool {
    use std::net::IpAddr;
    
    if let Ok(addr) = ip.parse::<IpAddr>() {
        match addr {
            IpAddr::V4(ipv4) => {
                let octets = ipv4.octets();
                // 10.0.0.0/8
                if octets[0] == 10 {
                    return true;
                }
                // 172.16.0.0/12
                if octets[0] == 172 && octets[1] >= 16 && octets[1] <= 31 {
                    return true;
                }
                // 192.168.0.0/16
                if octets[0] == 192 && octets[1] == 168 {
                    return true;
                }
                // 127.0.0.0/8 (localhost)
                if octets[0] == 127 {
                    return true;
                }
            }
            IpAddr::V6(_) => {
                // IPv6 localhost
                if ip == "::1" || ip.starts_with("fe80:") {
                    return true;
                }
            }
        }
    }
    false
}

