use crate::commands::Vulnerability;
use crate::scanner::checks::{make_vuln, vulns_from_software_line};
use std::path::Path;
use std::process::Command;
use std::str;

const TARGET: &str = "Local System";

pub async fn run_extended_local_checks() -> Vec<Vulnerability> {
    let mut vulns = Vec::new();
    vulns.extend(check_software_versions().await);
    vulns.extend(check_suid_binaries().await);
    vulns.extend(check_world_writable_sensitive().await);
    vulns.extend(check_docker_socket().await);
    vulns.extend(check_ip_forwarding().await);
    vulns.extend(check_selinux_apparmor().await);
    vulns.extend(check_fail2ban().await);
    vulns.extend(check_nfs_exports().await);
    vulns.extend(check_sudo_nopasswd().await);
    vulns.extend(check_empty_password_accounts().await);
    vulns.extend(check_cron_permissions().await);
    vulns.extend(check_unattended_upgrades().await);
    vulns
}

async fn check_software_versions() -> Vec<Vulnerability> {
    let mut vulns = Vec::new();

    #[cfg(unix)]
    {
        let probes: Vec<(&str, Vec<&str>)> = vec![
            ("openssh", vec!["ssh", "-V"]),
            ("openssl", vec!["openssl", "version"]),
            ("sudo", vec!["sudo", "--version"]),
        ];

        for (product, args) in probes {
            if let Ok(output) = Command::new(args[0]).args(&args[1..]).output() {
                let stdout = str::from_utf8(&output.stdout).unwrap_or("");
                let stderr = str::from_utf8(&output.stderr).unwrap_or("");
                let line = if !stderr.is_empty() { stderr } else { stdout };
                if !line.trim().is_empty() {
                    vulns.extend(vulns_from_software_line(line.trim(), product, TARGET));
                }
            }
        }

        if let Ok(output) = Command::new("polkitd").arg("--version").output() {
            let line = str::from_utf8(&output.stdout).unwrap_or("");
            if !line.is_empty() {
                vulns.extend(vulns_from_software_line(line.trim(), "polkit", TARGET));
            }
        } else if let Ok(output) = Command::new("pkexec").arg("--version").output() {
            let line = str::from_utf8(&output.stdout).unwrap_or("");
            if !line.is_empty() {
                vulns.extend(vulns_from_software_line(line.trim(), "polkit", TARGET));
            }
        }
    }

    vulns
}

async fn check_suid_binaries() -> Vec<Vulnerability> {
    let mut vulns = Vec::new();

    #[cfg(target_os = "linux")]
    {
        let risky = [
            "nmap", "vim", "nano", "find", "bash", "sh", "python", "python3", "perl", "ruby",
            "lua", "gcc", "cp", "mv", "less", "more", "awk", "nohup",
        ];

        if let Ok(output) = Command::new("sh")
            .arg("-c")
            .arg("find /usr /bin /sbin -perm -4000 -type f 2>/dev/null | head -80")
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                for line in stdout.lines() {
                    let path = line.trim();
                    if path.is_empty() {
                        continue;
                    }
                    let name = Path::new(path)
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");
                    if risky.iter().any(|r| name.contains(r)) {
                        vulns.push(make_vuln(
                            &format!("Risky SUID binary: {name}"),
                            &format!("{path} has the SUID bit — local privilege escalation if misused."),
                            "high",
                            "Remove unnecessary SUID bit or restrict execution to admin roles.",
                            TARGET,
                            None,
                        ));
                    }
                }
            }
        }
    }

    vulns
}

async fn check_world_writable_sensitive() -> Vec<Vulnerability> {
    let mut vulns = Vec::new();

    #[cfg(unix)]
    {
        let paths = ["/etc/passwd", "/etc/shadow", "/etc/sudoers", "/etc/crontab"];
        for path in paths {
            if let Ok(meta) = std::fs::metadata(path) {
                use std::os::unix::fs::PermissionsExt;
                let mode = meta.permissions().mode();
                if mode & 0o002 != 0 {
                    vulns.push(make_vuln(
                        &format!("World-writable sensitive file: {path}"),
                        "File is writable by any user — credential or config tampering possible.",
                        "critical",
                        &format!("Run chmod o-w {path} and correct ownership."),
                        TARGET,
                        None,
                    ));
                }
            }
        }
    }

    vulns
}

async fn check_docker_socket() -> Vec<Vulnerability> {
    let mut vulns = Vec::new();
    let sock = "/var/run/docker.sock";

    if Path::new(sock).exists() {
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(meta) = std::fs::metadata(sock) {
                let mode = meta.permissions().mode();
                if mode & 0o006 != 0 {
                    vulns.push(make_vuln(
                        "Docker socket accessible to non-root users",
                        "/var/run/docker.sock is group/world accessible — equals root on the host.",
                        "critical",
                        "chmod 660 docker.sock and limit docker group membership.",
                        TARGET,
                        None,
                    ));
                }
            }
        }
    }

    vulns
}

async fn check_ip_forwarding() -> Vec<Vulnerability> {
    let mut vulns = Vec::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/proc/sys/net/ipv4/ip_forward") {
            if content.trim() == "1" {
                vulns.push(make_vuln(
                    "IP forwarding enabled",
                    "Host routes traffic between interfaces — may indicate rogue gateway or pivot point.",
                    "medium",
                    "Disable unless this machine is an intentional router: sysctl -w net.ipv4.ip_forward=0",
                    TARGET,
                    None,
                ));
            }
        }
    }

    vulns
}

async fn check_selinux_apparmor() -> Vec<Vulnerability> {
    let mut vulns = Vec::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = Command::new("getenforce").output() {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                if stdout.trim().eq_ignore_ascii_case("Disabled") {
                    vulns.push(make_vuln(
                        "SELinux disabled",
                        "Mandatory access control is off — container/host escapes face fewer barriers.",
                        "medium",
                        "Enable SELinux enforcing mode where supported.",
                        TARGET,
                        None,
                    ));
                }
            }
        }

        if let Ok(output) = Command::new("aa-status").arg("--enabled").output() {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                if stdout.contains("no") {
                    vulns.push(make_vuln(
                        "AppArmor disabled",
                        "AppArmor profiles are not enforcing.",
                        "medium",
                        "Enable AppArmor: sudo systemctl enable --now apparmor",
                        TARGET,
                        None,
                    ));
                }
            }
        }
    }

    vulns
}

async fn check_fail2ban() -> Vec<Vulnerability> {
    let mut vulns = Vec::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = Command::new("systemctl")
            .args(["is-active", "fail2ban"])
            .output()
        {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                if stdout.trim() != "active" {
                    vulns.push(make_vuln(
                        "fail2ban not running",
                        "No active intrusion-prevention jail for SSH and web brute force.",
                        "medium",
                        "Install and enable fail2ban with sshd and nginx/apache jails.",
                        TARGET,
                        None,
                    ));
                }
            }
        }
    }

    vulns
}

async fn check_nfs_exports() -> Vec<Vulnerability> {
    let mut vulns = Vec::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(content) = std::fs::read_to_string("/etc/exports") {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() || trimmed.starts_with('#') {
                    continue;
                }
                if trimmed.contains("*(rw") || trimmed.contains("(rw,insecure") || trimmed.contains("no_root_squash") {
                    vulns.push(make_vuln(
                        "Insecure NFS export",
                        &format!("Export line: {trimmed}"),
                        "high",
                        "Restrict NFS exports to specific hosts and use root_squash.",
                        TARGET,
                        None,
                    ));
                }
            }
        }
    }

    vulns
}

async fn check_sudo_nopasswd() -> Vec<Vulnerability> {
    let mut vulns = Vec::new();

    #[cfg(unix)]
    {
        if let Ok(output) = Command::new("sudo").args(["-n", "true"]).output() {
            if output.status.success() {
                vulns.push(make_vuln(
                    "Passwordless sudo for current user",
                    "Current user can run sudo without a password — malware gains instant root.",
                    "high",
                    "Remove NOPASSWD entries from /etc/sudoers.d.",
                    TARGET,
                    None,
                ));
            }
        }
    }

    vulns
}

async fn check_empty_password_accounts() -> Vec<Vulnerability> {
    let mut vulns = Vec::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(output) = Command::new("awk").args([
            "-F:",
            "($2 == \"\" ) { print $1 }",
            "/etc/shadow",
        ]).output() {
            if let Ok(stdout) = str::from_utf8(&output.stdout) {
                for user in stdout.lines().map(str::trim).filter(|l| !l.is_empty()) {
                    vulns.push(make_vuln(
                        &format!("Account with empty password: {user}"),
                        "Shadow entry has no password hash — login without credentials may be possible.",
                        "critical",
                        &format!("Lock or set a password: sudo passwd -l {user}"),
                        TARGET,
                        None,
                    ));
                }
            }
        }
    }

    vulns
}

async fn check_cron_permissions() -> Vec<Vulnerability> {
    let mut vulns = Vec::new();

    #[cfg(unix)]
    {
        for path in ["/etc/cron.d", "/etc/cron.daily", "/var/spool/cron"] {
            if let Ok(entries) = std::fs::read_dir(path) {
                for entry in entries.flatten() {
                    if let Ok(meta) = entry.metadata() {
                        #[cfg(unix)]
                        {
                            use std::os::unix::fs::PermissionsExt;
                            if meta.permissions().mode() & 0o002 != 0 {
                                vulns.push(make_vuln(
                                    &format!("World-writable cron path: {}", entry.path().display()),
                                    "Anyone can plant scheduled jobs running as root.",
                                    "critical",
                                    "Fix permissions on cron directories and files.",
                                    TARGET,
                                    None,
                                ));
                            }
                        }
                    }
                }
            }
        }
    }

    vulns
}

async fn check_unattended_upgrades() -> Vec<Vulnerability> {
    let mut vulns = Vec::new();

    #[cfg(target_os = "linux")]
    {
        let conf = "/etc/apt/apt.conf.d/20auto-upgrades";
        if Path::new(conf).exists() {
            if let Ok(content) = std::fs::read_to_string(conf) {
                if !content.contains("Unattended-Upgrade \"1\"") {
                    vulns.push(make_vuln(
                        "Automatic security updates disabled",
                        "Unattended upgrades are not enabled for APT.",
                        "low",
                        "Enable unattended-upgrades for security patches.",
                        TARGET,
                        None,
                    ));
                }
            }
        }
    }

    vulns
}
