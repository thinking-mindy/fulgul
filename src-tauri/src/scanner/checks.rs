use crate::commands::Vulnerability;
use regex::Regex;
use std::time::SystemTime;

pub fn generate_scan_id() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use rand::Rng;
    let mut hasher = DefaultHasher::new();
    SystemTime::now().hash(&mut hasher);
    rand::thread_rng().gen::<u64>().hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

pub fn make_vuln(
    title: &str,
    description: &str,
    severity: &str,
    remediation: &str,
    target: &str,
    cve: Option<&str>,
) -> Vulnerability {
    Vulnerability {
        id: generate_scan_id(),
        title: title.to_string(),
        description: description.to_string(),
        severity: severity.to_string(),
        cve: cve.map(|s| s.to_string()),
        affected_systems: vec![target.to_string()],
        detected_at: chrono::Utc::now().to_rfc3339(),
        remediation: remediation.to_string(),
    }
}

/// Ports commonly tied to exploitable or sensitive services.
pub fn remote_scan_ports() -> Vec<u16> {
    let mut ports: Vec<u16> = (1..=1024).collect();
    let high_risk = [
        1080, 1433, 1521, 2049, 2121, 2375, 2376, 3000, 3128, 3260, 4444, 5000, 5001, 5432,
        5555, 5900, 5901, 5984, 6379, 6666, 7001, 8000, 8008, 8080, 8081, 8443, 8888, 9000,
        9090, 9200, 9300, 11211, 15672, 27017, 27018, 50070,
    ];
    ports.extend(high_risk);
    ports.sort_unstable();
    ports.dedup();
    ports
}

pub struct PortRisk {
    pub port: u16,
    pub service: &'static str,
    pub description: &'static str,
    pub severity: &'static str,
}

pub fn dangerous_port_catalog() -> Vec<PortRisk> {
    vec![
        PortRisk { port: 21, service: "FTP", description: "FTP may allow cleartext credentials or anonymous upload.", severity: "high" },
        PortRisk { port: 22, service: "SSH", description: "SSH exposed — verify keys, patching, and brute-force protection.", severity: "medium" },
        PortRisk { port: 23, service: "Telnet", description: "Telnet sends credentials in cleartext.", severity: "critical" },
        PortRisk { port: 25, service: "SMTP", description: "Open mail relay or unauthenticated SMTP can be abused.", severity: "medium" },
        PortRisk { port: 53, service: "DNS", description: "DNS resolver open to the network may enable amplification abuse.", severity: "medium" },
        PortRisk { port: 69, service: "TFTP", description: "TFTP has no authentication and is often misconfigured.", severity: "high" },
        PortRisk { port: 111, service: "RPCbind", description: "RPC services can leak attack surface (NFS, NIS).", severity: "medium" },
        PortRisk { port: 135, service: "RPC", description: "Microsoft RPC endpoint mapper exposed.", severity: "high" },
        PortRisk { port: 139, service: "NetBIOS", description: "NetBIOS/SMB legacy surface exposed.", severity: "high" },
        PortRisk { port: 161, service: "SNMP", description: "SNMP with default community strings enables recon and config leaks.", severity: "high" },
        PortRisk { port: 445, service: "SMB", description: "SMB exposed — EternalBlue-class bugs and share enumeration risk.", severity: "critical" },
        PortRisk { port: 512, service: "rexec", description: "Legacy r-services trust remote hosts without strong auth.", severity: "critical" },
        PortRisk { port: 513, service: "rlogin", description: "rlogin trusts host-based authentication.", severity: "critical" },
        PortRisk { port: 514, service: "rsh", description: "Remote shell without modern cryptography.", severity: "critical" },
        PortRisk { port: 1433, service: "MSSQL", description: "Microsoft SQL Server reachable from the network.", severity: "high" },
        PortRisk { port: 1521, service: "Oracle", description: "Oracle listener exposed.", severity: "high" },
        PortRisk { port: 2049, service: "NFS", description: "NFS exports may leak files without proper auth.", severity: "high" },
        PortRisk { port: 2375, service: "Docker", description: "Unencrypted Docker API — remote root on host.", severity: "critical" },
        PortRisk { port: 2376, service: "Docker-TLS", description: "Docker API exposed — verify TLS and ACLs.", severity: "high" },
        PortRisk { port: 3000, service: "Dev-HTTP", description: "Development web service often lacks hardening.", severity: "medium" },
        PortRisk { port: 3306, service: "MySQL", description: "Database port exposed to the network.", severity: "high" },
        PortRisk { port: 3389, service: "RDP", description: "RDP exposed — BlueKeep-class risk and credential attacks.", severity: "critical" },
        PortRisk { port: 4444, service: "Metasploit", description: "Common reverse-shell / Metasploit handler port.", severity: "critical" },
        PortRisk { port: 5432, service: "PostgreSQL", description: "PostgreSQL exposed without network ACLs.", severity: "high" },
        PortRisk { port: 5900, service: "VNC", description: "VNC often uses weak or missing authentication.", severity: "high" },
        PortRisk { port: 6379, service: "Redis", description: "Redis without AUTH allows remote code execution.", severity: "critical" },
        PortRisk { port: 8080, service: "HTTP-Alt", description: "Alternate HTTP port — admin panels and proxies often live here.", severity: "medium" },
        PortRisk { port: 9200, service: "Elasticsearch", description: "Elasticsearch without auth leaks indices and enables RCE chains.", severity: "critical" },
        PortRisk { port: 11211, service: "Memcached", description: "Memcached amplification and data exfiltration risk.", severity: "high" },
        PortRisk { port: 27017, service: "MongoDB", description: "MongoDB without auth allows full database compromise.", severity: "critical" },
    ]
}

pub fn vulns_from_open_ports(ports: &[u16], target: &str) -> Vec<Vulnerability> {
    let mut vulns = Vec::new();
    for risk in dangerous_port_catalog() {
        if ports.contains(&risk.port) {
            vulns.push(make_vuln(
                &format!("Exposed {} service (port {})", risk.service, risk.port),
                risk.description,
                risk.severity,
                &format!(
                    "Restrict port {} to management networks, patch the service, and require strong authentication.",
                    risk.port
                ),
                target,
                None,
            ));
        }
    }
    vulns
}

struct BannerRule {
    pattern: &'static str,
    title: &'static str,
    description: &'static str,
    severity: &'static str,
    cve: Option<&'static str>,
    remediation: &'static str,
}

fn banner_rules() -> Vec<BannerRule> {
    vec![
        BannerRule {
            pattern: r"(?i)openssh[/_-]?(?:[0-7]\.|8\.[0-4])",
            title: "Outdated OpenSSH",
            description: "OpenSSH banner indicates a version with known CVEs (e.g. regreSSHion, privilege escalation chains).",
            severity: "high",
            cve: Some("CVE-2024-6387"),
            remediation: "Upgrade OpenSSH to the latest stable release from your vendor.",
        },
        BannerRule {
            pattern: r"(?i)apache/2\.(?:2\.[0-9]|4\.[0-4][0-9]?)",
            title: "Outdated Apache httpd",
            description: "Apache version in banner is EOL or has published HTTP request smuggling / mod_proxy CVEs.",
            severity: "high",
            cve: Some("CVE-2023-25690"),
            remediation: "Patch Apache httpd to the latest 2.4.x release.",
        },
        BannerRule {
            pattern: r"(?i)nginx/1\.(?:[0-9]\.|1[0-7]\.)",
            title: "Outdated nginx",
            description: "nginx version may be affected by HTTP/2 DoS and alias traversal issues.",
            severity: "medium",
            cve: Some("CVE-2023-44487"),
            remediation: "Upgrade nginx to a supported release.",
        },
        BannerRule {
            pattern: r"(?i)microsoft-iis/7\.|microsoft-iis/8\.0",
            title: "Legacy Microsoft IIS",
            description: "IIS 7/8.0 is out of mainstream support and accumulates unpatched RCE/DoS flaws.",
            severity: "high",
            cve: None,
            remediation: "Migrate to a supported Windows Server / IIS release.",
        },
        BannerRule {
            pattern: r"(?i)proftpd 1\.3\.[0-5]",
            title: "Vulnerable ProFTPD",
            description: "ProFTPD 1.3.5 and older had remote command execution bugs.",
            severity: "critical",
            cve: Some("CVE-2019-18217"),
            remediation: "Upgrade ProFTPD or disable the service.",
        },
        BannerRule {
            pattern: r"(?i)vsftpd 2\.3\.4",
            title: "vsftpd backdoor (2.3.4)",
            description: "vsftpd 2.3.4 shipped with a known backdoor triggered by ':)' in username.",
            severity: "critical",
            cve: Some("CVE-2011-2523"),
            remediation: "Remove compromised vsftpd build and reinstall from trusted packages.",
        },
        BannerRule {
            pattern: r"(?i)smbd 3\.|smbd 4\.0\.|smbd 4\.1\.",
            title: "Legacy Samba (SMB)",
            description: "Old Samba versions are affected by EternalBlue-class and auth bypass issues.",
            severity: "critical",
            cve: Some("CVE-2017-7494"),
            remediation: "Upgrade Samba and disable SMBv1.",
        },
        BannerRule {
            pattern: r"(?i)redis",
            title: "Redis without TLS",
            description: "Redis responds on the network — if AUTH/ACL is missing, attackers can write cron/webshells.",
            severity: "critical",
            cve: None,
            remediation: "Bind Redis to localhost, enable ACL AUTH, and use TLS.",
        },
        BannerRule {
            pattern: r"(?i)mongodb",
            title: "MongoDB service exposed",
            description: "MongoDB reachable remotely — unauthenticated instances allow full database takeover.",
            severity: "critical",
            cve: None,
            remediation: "Enable authentication, TLS, and network segmentation.",
        },
        BannerRule {
            pattern: r"(?i)elastic",
            title: "Elasticsearch exposed",
            description: "Elasticsearch cluster answers without X-Pack auth — indices and scripts may be reachable.",
            severity: "critical",
            cve: None,
            remediation: "Enable authentication, firewall the API, and disable dynamic scripting.",
        },
    ]
}

pub fn vulns_from_banner(banner: &str, port: u16, service: &str, target: &str) -> Vec<Vulnerability> {
    let mut vulns = Vec::new();
    let haystack = banner.to_lowercase();

    for rule in banner_rules() {
        if let Ok(re) = Regex::new(rule.pattern) {
            if re.is_match(&haystack) {
                vulns.push(make_vuln(
                    &format!("{} on port {} ({})", rule.title, port, service),
                    rule.description,
                    rule.severity,
                    rule.remediation,
                    target,
                    rule.cve,
                ));
            }
        }
    }

    if (port == 80 || port == 8080 || port == 8000 || port == 443 || port == 8443)
        && haystack.contains("index of /")
    {
        vulns.push(make_vuln(
            &format!("Directory listing enabled (port {})", port),
            "Web server exposes directory indexes — attackers can harvest backups and configs.",
            "high",
            "Disable autoindex and restrict filesystem exposure.",
            target,
            None,
        ));
    }

    if (port == 80 || port == 8080 || port == 443 || port == 8443)
        && !haystack.contains("x-frame-options")
        && haystack.contains("http/")
    {
        vulns.push(make_vuln(
            &format!("Missing X-Frame-Options (port {})", port),
            "Clickjacking protection header not present on HTTP responses.",
            "medium",
            "Add X-Frame-Options or Content-Security-Policy frame-ancestors.",
            target,
            None,
        ));
    }

    vulns
}

pub fn vulns_from_software_line(line: &str, product: &str, target: &str) -> Vec<Vulnerability> {
    let mut vulns = Vec::new();
    let lower = line.to_lowercase();

    if product == "openssl" && (lower.contains("1.0.") || lower.contains("1.1.0") || lower.contains("1.1.1")) {
        vulns.push(make_vuln(
            "End-of-life OpenSSL",
            &format!("Detected: {line}"),
            "high",
            "Upgrade to OpenSSL 3.x from your OS vendor.",
            target,
            Some("CVE-2022-3602"),
        ));
    }

    if product == "openssh" {
        vulns.extend(vulns_from_banner(line, 22, "SSH", target));
    }

    if product == "sudo" && lower.contains("1.8.") {
        vulns.push(make_vuln(
            "Outdated sudo",
            &format!("Detected: {line}"),
            "high",
            "Upgrade sudo — Baron Samedit-class bugs affected 1.8.x.",
            target,
            Some("CVE-2021-3156"),
        ));
    }

    if product == "polkit" && (lower.contains("0.105") || lower.contains("0.113")) {
        vulns.push(make_vuln(
            "Vulnerable polkit (pkexec)",
            &format!("Detected: {line}"),
            "critical",
            "Upgrade polkit — PwnKit allowed local privilege escalation.",
            target,
            Some("CVE-2021-4034"),
        ));
    }

    vulns
}

pub fn identify_service_name(port: u16) -> &'static str {
    dangerous_port_catalog()
        .iter()
        .find(|r| r.port == port)
        .map(|r| r.service)
        .unwrap_or("unknown")
}
