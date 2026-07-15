use crate::commands::{ScanResult, Vulnerability};
use crate::scanner::checks::{generate_scan_id, identify_service_name, remote_scan_ports, vulns_from_open_ports};
use crate::scanner::probes::probe_open_ports;
use crate::scanner::utils::{calculate_security_score, is_private_ip};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::timeout;

const PORT_SCAN_TIMEOUT: Duration = Duration::from_millis(400);
const MAX_SCAN_DURATION: Duration = Duration::from_secs(90);
const CONCURRENT_SCANS: usize = 150;

pub async fn scan_remote_ip(ip: String) -> Result<ScanResult, String> {
    if is_private_ip(&ip) {
        eprintln!("Warning: Scanning private IP address: {}", ip);
    }

    let timestamp = chrono::Utc::now().to_rfc3339();
    let target_label = format!("Remote: {ip}");
    let ports_to_scan = remote_scan_ports();

    let discovered_ports = match timeout(MAX_SCAN_DURATION, scan_ports_parallel(&ip, &ports_to_scan)).await {
        Ok(ports) => ports,
        Err(_) => {
            eprintln!("Scan timeout after {} seconds", MAX_SCAN_DURATION.as_secs());
            Vec::new()
        }
    };

    let mut open_ports = discovered_ports.clone();
    open_ports.sort_unstable();
    open_ports.dedup();

    let services: Vec<String> = open_ports
        .iter()
        .map(|p| identify_service_name(*p).to_string())
        .collect();

    let mut vulnerabilities: Vec<Vulnerability> = Vec::new();
    vulnerabilities.extend(vulns_from_open_ports(&open_ports, &target_label));
    vulnerabilities.extend(probe_open_ports(&ip, &open_ports, &target_label).await);

    // Deduplicate by title
    vulnerabilities.sort_by(|a, b| a.title.cmp(&b.title));
    vulnerabilities.dedup_by(|a, b| a.title == b.title);

    let security_score = calculate_security_score(&vulnerabilities, &open_ports, 0);

    Ok(ScanResult {
        id: generate_scan_id(),
        os: target_label.clone(),
        timestamp,
        vulnerabilities,
        open_ports,
        services: Some(services),
        security_score: security_score.score,
        security_grade: security_score.grade,
    })
}

async fn scan_ports_parallel(ip: &str, ports: &[u16]) -> Vec<u16> {
    let (tx, mut rx) = mpsc::unbounded_channel();
    let ip = Arc::new(ip.to_string());

    for chunk in ports.chunks(CONCURRENT_SCANS) {
        let mut batch_handles = Vec::new();

        for port in chunk {
            let ip_clone = Arc::clone(&ip);
            let tx_clone = tx.clone();
            let port = *port;

            let handle = tokio::spawn(async move {
                if let Ok(true) = check_port_open_fast(&ip_clone, port).await {
                    let _ = tx_clone.send(port);
                }
            });

            batch_handles.push(handle);
        }

        let batch_timeout = Duration::from_secs(8);
        let _ = timeout(batch_timeout, futures::future::join_all(batch_handles)).await;
    }

    drop(tx);

    let mut open_ports = Vec::new();
    while let Some(port) = rx.recv().await {
        open_ports.push(port);
    }

    open_ports
}

async fn check_port_open_fast(ip: &str, port: u16) -> Result<bool, String> {
    let addr = format!("{ip}:{port}");

    match timeout(PORT_SCAN_TIMEOUT, async {
        match tokio::net::TcpStream::connect(&addr).await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    })
    .await
    {
        Ok(result) => result,
        Err(_) => Ok(false),
    }
}
