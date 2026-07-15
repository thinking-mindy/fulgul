use crate::commands::Vulnerability;
use crate::scanner::checks::{identify_service_name, make_vuln, vulns_from_banner};
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::time::timeout;

const PROBE_TIMEOUT: Duration = Duration::from_secs(3);

async fn connect(ip: &str, port: u16) -> Option<TcpStream> {
    let addr = format!("{ip}:{port}");
    match timeout(PROBE_TIMEOUT, TcpStream::connect(addr)).await {
        Ok(Ok(stream)) => Some(stream),
        _ => None,
    }
}

pub async fn probe_open_ports(ip: &str, ports: &[u16], target_label: &str) -> Vec<Vulnerability> {
    let mut vulns = Vec::new();

    for &port in ports {
        if let Some(banner) = grab_banner(ip, port).await {
            let service = identify_service_name(port);
            vulns.extend(vulns_from_banner(&banner, port, service, target_label));

            if port == 21 || banner.to_uppercase().contains("FTP") {
                if let Some(v) = probe_ftp_anonymous(ip, port, target_label).await {
                    vulns.push(v);
                }
            }

            if port == 6379 || banner.to_uppercase().contains("REDIS") {
                if let Some(v) = probe_redis_no_auth(ip, port, target_label).await {
                    vulns.push(v);
                }
            }
        }

        if matches!(port, 80 | 443 | 8080 | 8000 | 8443 | 3000) {
            if let Some(response) = probe_http_get(ip, port).await {
                let service = identify_service_name(port);
                vulns.extend(vulns_from_banner(&response, port, service, target_label));
            }
        }
    }

    vulns
}

async fn grab_banner(ip: &str, port: u16) -> Option<String> {
    let mut stream = connect(ip, port).await?;
    let mut buf = vec![0u8; 2048];

    let n = match timeout(Duration::from_millis(1500), stream.read(&mut buf)).await {
        Ok(Ok(n)) => n,
        _ => return None,
    };

    if n == 0 {
        return None;
    }

    Some(String::from_utf8_lossy(&buf[..n]).to_string())
}

async fn probe_http_get(ip: &str, port: u16) -> Option<String> {
    let mut stream = connect(ip, port).await?;
    let host = if ip.contains(':') {
        format!("[{ip}]")
    } else {
        ip.to_string()
    };
    let request = format!(
        "GET / HTTP/1.1\r\nHost: {host}\r\nUser-Agent: Fulgul-Scanner/1.0\r\nConnection: close\r\nAccept: */*\r\n\r\n"
    );
    stream.write_all(request.as_bytes()).await.ok()?;

    let mut buf = vec![0u8; 8192];
    let n = match timeout(Duration::from_millis(2000), stream.read(&mut buf)).await {
        Ok(Ok(n)) => n,
        _ => return None,
    };

    if n == 0 {
        return None;
    }

    Some(String::from_utf8_lossy(&buf[..n]).to_string())
}

async fn probe_ftp_anonymous(ip: &str, port: u16, target: &str) -> Option<Vulnerability> {
    let mut stream = connect(ip, port).await?;
    let mut buf = vec![0u8; 1024];
    let _ = stream.read(&mut buf).await;

    stream.write_all(b"USER anonymous\r\n").await.ok()?;
    buf.fill(0);
    let n1 = match timeout(Duration::from_millis(1000), stream.read(&mut buf)).await {
        Ok(Ok(n)) => n,
        _ => return None,
    };
    let reply1 = String::from_utf8_lossy(&buf[..n1]).to_lowercase();

    stream.write_all(b"PASS guest@example.com\r\n").await.ok()?;
    buf.fill(0);
    let n2 = match timeout(Duration::from_millis(1000), stream.read(&mut buf)).await {
        Ok(Ok(n)) => n,
        _ => return None,
    };
    let reply2 = String::from_utf8_lossy(&buf[..n2]).to_lowercase();

    if reply1.contains("230") || reply2.contains("230") || reply2.contains("logged in") {
        return Some(make_vuln(
            &format!("Anonymous FTP allowed (port {port})"),
            "FTP server accepted anonymous credentials — readable/writable shares may be exposed.",
            "high",
            "Disable anonymous FTP or restrict to read-only chroot.",
            target,
            None,
        ));
    }

    None
}

async fn probe_redis_no_auth(ip: &str, port: u16, target: &str) -> Option<Vulnerability> {
    let mut stream = connect(ip, port).await?;
    stream.write_all(b"PING\r\n").await.ok()?;
    let mut buf = vec![0u8; 256];
    let n = match timeout(Duration::from_millis(1000), stream.read(&mut buf)).await {
        Ok(Ok(n)) => n,
        _ => return None,
    };
    let reply = String::from_utf8_lossy(&buf[..n]);

    if reply.contains("+PONG") {
        return Some(make_vuln(
            &format!("Redis responds without AUTH (port {port})"),
            "Redis accepted PING without authentication — remote attackers can write keys or invoke modules.",
            "critical",
            "Set requirepass/ACL, bind to localhost, and firewall port 6379.",
            target,
            None,
        ));
    }

    None
}
