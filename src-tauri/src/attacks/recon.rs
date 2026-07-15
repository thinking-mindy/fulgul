use super::bruteforce::shell::{command_exists, run_timed_shell};
use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReconFinding {
    pub label: String,
    pub value: String,
    pub severity: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReconResult {
    pub kind: String,
    pub target: String,
    pub success: bool,
    pub findings: Vec<ReconFinding>,
    pub raw_output: String,
    pub duration_ms: u64,
}

fn finding(label: &str, value: &str, severity: &str) -> ReconFinding {
    ReconFinding {
        label: label.to_string(),
        value: value.to_string(),
        severity: severity.to_string(),
    }
}

pub async fn recon_dns(domain: &str) -> Result<ReconResult, String> {
    let target = domain.trim().to_lowercase();
    if target.is_empty() {
        return Err("Domain is required".to_string());
    }

    let start = Instant::now();
    let mut findings = Vec::new();
    let mut raw = String::new();

    if command_exists("dig").await {
        let a = run_timed_shell(&format!("dig +short A {target}"), 15).await.unwrap_or_default();
        let aaaa = run_timed_shell(&format!("dig +short AAAA {target}"), 15)
            .await
            .unwrap_or_default();
        let mx = run_timed_shell(&format!("dig +short MX {target}"), 15)
            .await
            .unwrap_or_default();
        let ns = run_timed_shell(&format!("dig +short NS {target}"), 15)
            .await
            .unwrap_or_default();
        let txt = run_timed_shell(&format!("dig +short TXT {target}"), 15)
            .await
            .unwrap_or_default();

        raw = format!("A:\n{a}\n\nAAAA:\n{aaaa}\n\nMX:\n{mx}\n\nNS:\n{ns}\n\nTXT:\n{txt}");

        if !a.trim().is_empty() {
            findings.push(finding("A records", a.trim(), "info"));
        }
        if !mx.trim().is_empty() {
            findings.push(finding("MX records", mx.trim(), "medium"));
        }
        if !ns.trim().is_empty() {
            findings.push(finding("NS records", ns.trim(), "info"));
        }
        if !txt.trim().is_empty() {
            findings.push(finding("TXT records", txt.trim(), "medium"));
        }
    } else {
        let out = run_timed_shell(&format!("nslookup {target}"), 20).await?;
        raw = out.clone();
        let excerpt = out.lines().take(8).collect::<Vec<_>>().join(" | ");
        findings.push(finding("DNS lookup", &excerpt, "info"));
    }

    Ok(ReconResult {
        kind: "dns".to_string(),
        target: target.clone(),
        success: !findings.is_empty() || !raw.trim().is_empty(),
        findings,
        raw_output: raw,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

pub async fn recon_ssl(host: &str, port: u16) -> Result<ReconResult, String> {
    let target = host.trim();
    if target.is_empty() {
        return Err("Host is required".to_string());
    }

    let start = Instant::now();
    let connect = format!("{target}:{port}");

    let cmd = if command_exists("openssl").await {
        format!(
            "echo | openssl s_client -connect {connect} -servername {target} 2>/dev/null | openssl x509 -noout -dates -subject -issuer -ext subjectAltName 2>/dev/null"
        )
    } else {
        return Err("openssl not found on PATH".to_string());
    };

    let raw = run_timed_shell(&cmd, 25).await.unwrap_or_default();
    let mut findings = Vec::new();

    for line in raw.lines() {
        let l = line.trim();
        if l.starts_with("notAfter=") {
            let expiry = l.trim_start_matches("notAfter=").trim();
            let severity = if expiry.contains("2025") || expiry.contains("2026") {
                "medium"
            } else {
                "info"
            };
            findings.push(finding("Certificate expiry", expiry, severity));
        } else if l.starts_with("subject=") {
            findings.push(finding("Subject", l.trim_start_matches("subject=").trim(), "info"));
        } else if l.starts_with("issuer=") {
            findings.push(finding("Issuer", l.trim_start_matches("issuer=").trim(), "info"));
        } else if l.contains("DNS:") {
            findings.push(finding("SAN", l, "info"));
        }
    }

    if findings.is_empty() && !raw.is_empty() {
        let excerpt = raw.lines().take(5).collect::<Vec<_>>().join("; ");
        findings.push(finding("Certificate", &excerpt, "info"));
    }

    Ok(ReconResult {
        kind: "ssl".to_string(),
        target: connect.clone(),
        success: !raw.trim().is_empty(),
        findings,
        raw_output: raw,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

pub async fn recon_http_headers(url: &str) -> Result<ReconResult, String> {
    let target = url.trim();
    if target.is_empty() {
        return Err("URL is required".to_string());
    }

    let start = Instant::now();
    let cmd = if command_exists("curl").await {
        format!("curl -sSILk --max-time 15 {target}")
    } else {
        return Err("curl not found on PATH".to_string());
    };

    let raw = run_timed_shell(&cmd, 20).await?;
    let mut findings = Vec::new();

    let security_headers = [
        ("strict-transport-security", "high"),
        ("content-security-policy", "high"),
        ("x-frame-options", "medium"),
        ("x-content-type-options", "medium"),
        ("referrer-policy", "low"),
        ("permissions-policy", "low"),
    ];

    let lower = raw.to_lowercase();
    for (header, sev) in security_headers {
        if lower.contains(header) {
            let line = raw
                .lines()
                .find(|l| l.to_lowercase().contains(header))
                .unwrap_or(header)
                .trim()
                .to_string();
            findings.push(finding(&format!("Header: {header}"), &line, sev));
        } else {
            findings.push(finding(
                &format!("Missing: {header}"),
                "Not present in response",
                "medium",
            ));
        }
    }

    if let Some(status) = raw.lines().next() {
        findings.insert(0, finding("Status line", status.trim(), "info"));
    }

    Ok(ReconResult {
        kind: "http_headers".to_string(),
        target: target.to_string(),
        success: true,
        findings,
        raw_output: raw,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

pub async fn recon_port_banner(host: &str, port: u16) -> Result<ReconResult, String> {
    let target = host.trim();
    if target.is_empty() {
        return Err("Host is required".to_string());
    }

    let start = Instant::now();
    let cmd = if command_exists("nc").await {
        format!("echo '' | nc -w 3 {target} {port} 2>/dev/null | head -c 512")
    } else if command_exists("curl").await {
        format!("curl -s --max-time 5 {target}:{port} 2>&1 | head -c 512")
    } else {
        return Err("nc or curl required for banner grab".to_string());
    };

    let raw = run_timed_shell(&cmd, 10).await.unwrap_or_default();
    let banner = raw.trim();
    let success = !banner.is_empty();

    let findings = if success {
        vec![finding("Banner", banner, "medium")]
    } else {
        vec![finding("Banner", "No banner received (port may be filtered)", "info")]
    };

    Ok(ReconResult {
        kind: "banner".to_string(),
        target: format!("{target}:{port}"),
        success,
        findings,
        raw_output: raw,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

pub async fn recon_whois(domain: &str) -> Result<ReconResult, String> {
    let target = domain.trim().to_lowercase();
    if target.is_empty() {
        return Err("Domain is required".to_string());
    }

    let start = Instant::now();
    let raw = if command_exists("whois").await {
        run_timed_shell(&format!("whois {target}"), 30).await?
    } else {
        return Err("whois not found on PATH".to_string());
    };

    let mut findings = Vec::new();
    for line in raw.lines().take(80) {
        let l = line.trim();
        if l.to_lowercase().starts_with("registrar:") {
            findings.push(finding("Registrar", l.split_once(':').map(|(_, v)| v.trim()).unwrap_or(l), "info"));
        } else if l.to_lowercase().starts_with("creation date:") || l.to_lowercase().starts_with("created:") {
            findings.push(finding("Created", l.split_once(':').map(|(_, v)| v.trim()).unwrap_or(l), "info"));
        } else if l.to_lowercase().starts_with("expiry date:") || l.to_lowercase().contains("expiration") {
            findings.push(finding("Expiry", l.split_once(':').map(|(_, v)| v.trim()).unwrap_or(l), "medium"));
        }
    }

    if findings.is_empty() {
        let excerpt = raw.lines().take(6).collect::<Vec<_>>().join(" | ");
        findings.push(finding("WHOIS excerpt", &excerpt, "info"));
    }

    Ok(ReconResult {
        kind: "whois".to_string(),
        target: target.clone(),
        success: !raw.trim().is_empty(),
        findings,
        raw_output: raw.chars().take(8000).collect(),
        duration_ms: start.elapsed().as_millis() as u64,
    })
}
