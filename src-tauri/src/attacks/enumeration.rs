use super::bruteforce::shell::{command_exists, run_timed_shell};
use super::recon::{ReconFinding, ReconResult};
use std::time::{Duration, Instant};
use tokio::net::TcpStream;
use tokio::time::timeout;

const COMMON_PORTS: &[u16] = &[
    21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995, 1433, 1521, 3306,
    3389, 5432, 5900, 6379, 8080, 8443, 9200, 27017,
];

const COMMON_SUBS: &[&str] = &[
    "www", "mail", "ftp", "admin", "api", "dev", "staging", "test", "vpn", "portal", "app",
    "cdn", "blog", "shop", "secure", "remote", "mx", "ns1", "ns2", "webmail",
];

const COMMON_PATHS: &[&str] = &[
    "/",
    "/admin",
    "/login",
    "/api",
    "/api/v1",
    "/.git",
    "/robots.txt",
    "/sitemap.xml",
    "/.env",
    "/wp-admin",
    "/wp-login.php",
    "/dashboard",
    "/console",
    "/swagger",
    "/health",
];

fn finding(label: &str, value: &str, severity: &str) -> ReconFinding {
    ReconFinding {
        label: label.to_string(),
        value: value.to_string(),
        severity: severity.to_string(),
    }
}

async fn check_port(host: &str, port: u16) -> bool {
    let addr = format!("{host}:{port}");
    timeout(
        Duration::from_millis(500),
        TcpStream::connect(&addr),
    )
    .await
    .ok()
    .and_then(|r| r.ok())
    .is_some()
}

pub async fn port_sweep(host: &str) -> Result<ReconResult, String> {
    let target = host.trim();
    if target.is_empty() {
        return Err("Host is required".to_string());
    }

    let start = Instant::now();
    let mut open = Vec::new();
    let mut handles = Vec::new();

    for &port in COMMON_PORTS {
        let h = target.to_string();
        handles.push(tokio::spawn(async move {
            let open = check_port(&h, port).await;
            (port, open)
        }));
    }

    for handle in handles {
        if let Ok((port, is_open)) = handle.await {
            if is_open {
                open.push(port);
            }
        }
    }

    open.sort_unstable();
    let services: Vec<String> = open
        .iter()
        .map(|p| crate::scanner::checks::identify_service_name(*p).to_string())
        .collect();

    let mut findings = Vec::new();
    if open.is_empty() {
        findings.push(finding("Open ports", "None detected on common ports", "info"));
    } else {
        findings.push(finding(
            "Open ports",
            &open.iter().map(|p| p.to_string()).collect::<Vec<_>>().join(", "),
            "high",
        ));
        findings.push(finding("Services", &services.join(", "), "medium"));
    }

    let raw = format!("Port sweep on {target}\nOpen: {open:?}\nServices: {services:?}");

    let _ = crate::storage::workspace::add_or_update_target(
        target,
        open.clone(),
        services,
        "port_sweep",
        &format!("{} open ports", open.len()),
    )
    .await;
    let _ = crate::storage::workspace::set_phase_status("enumeration", "active").await;

    Ok(ReconResult {
        kind: "port_sweep".to_string(),
        target: target.to_string(),
        success: !open.is_empty(),
        findings,
        raw_output: raw,
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

pub async fn subdomain_enum(domain: &str) -> Result<ReconResult, String> {
    let target = domain.trim().to_lowercase();
    if target.is_empty() {
        return Err("Domain is required".to_string());
    }

    let start = Instant::now();
    let mut findings = Vec::new();
    let mut resolved = Vec::new();
    let mut raw_lines = Vec::new();

    for sub in COMMON_SUBS {
        let fqdn = format!("{sub}.{target}");
        let cmd = if command_exists("dig").await {
            format!("dig +short A {fqdn}")
        } else {
            format!("nslookup {fqdn}")
        };
        if let Ok(out) = run_timed_shell(&cmd, 8).await {
            let trimmed = out.trim();
            if !trimmed.is_empty() && !trimmed.contains("NXDOMAIN") && !trimmed.contains("can't find") {
                resolved.push(format!("{fqdn} -> {trimmed}"));
                findings.push(finding(&fqdn, trimmed.lines().next().unwrap_or(trimmed), "medium"));
                let _ = crate::storage::workspace::add_domain(&fqdn).await;
            }
            raw_lines.push(format!("{fqdn}: {trimmed}"));
        }
    }

    let _ = crate::storage::workspace::add_domain(&target).await;
    let _ = crate::storage::workspace::set_phase_status("enumeration", "active").await;

    Ok(ReconResult {
        kind: "subdomain_enum".to_string(),
        target: target.clone(),
        success: !resolved.is_empty(),
        findings,
        raw_output: raw_lines.join("\n"),
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

pub async fn web_path_enum(url: &str) -> Result<ReconResult, String> {
    let base = url.trim().trim_end_matches('/');
    if base.is_empty() {
        return Err("URL is required".to_string());
    }

    let start = Instant::now();
    let mut findings = Vec::new();
    let mut raw_lines = Vec::new();

    if !command_exists("curl").await {
        return Err("curl not found on PATH".to_string());
    }

    for path in COMMON_PATHS {
        let full = format!("{base}{path}");
        let cmd = format!("curl -sSILk --max-time 6 -o /dev/null -w '%{{http_code}}' {full}");
        if let Ok(code) = run_timed_shell(&cmd, 10).await {
            let status = code.trim();
            if status.starts_with('2') || status.starts_with('3') || status == "401" || status == "403" {
                let sev = if status.starts_with('2') { "high" } else { "medium" };
                findings.push(finding(&full, &format!("HTTP {status}"), sev));
                raw_lines.push(format!("{full} -> {status}"));
            }
        }
    }

    let _ = crate::storage::workspace::add_url(base).await;
    let _ = crate::storage::workspace::set_phase_status("enumeration", "active").await;

    Ok(ReconResult {
        kind: "web_path_enum".to_string(),
        target: base.to_string(),
        success: !findings.is_empty(),
        findings,
        raw_output: raw_lines.join("\n"),
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

pub async fn service_enum(host: &str, port: u16) -> Result<ReconResult, String> {
    super::recon::recon_port_banner(host, port).await
}
