use super::jobs::{finish_job, log_job, register_job, should_stop, update_progress, BruteJobResult};
use super::shell::{command_exists, run_timed_shell};
use super::wordlists::load_wordlist_lines;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpUserEnumResult {
    pub username: String,
    pub likely_valid: bool,
    pub status_code: u16,
    pub response_len: usize,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpBruteParams {
    pub url: String,
    pub method: Option<String>,
    pub username_field: String,
    pub password_field: String,
    pub username: Option<String>,
    pub username_wordlist_id: Option<String>,
    pub password_wordlist_id: String,
    pub extra_fields: Option<std::collections::HashMap<String, String>>,
    pub failure_indicators: Option<Vec<String>>,
    pub success_indicators: Option<Vec<String>>,
}

fn default_failures() -> Vec<String> {
    vec![
        "invalid".into(),
        "incorrect".into(),
        "failed".into(),
        "denied".into(),
        "wrong".into(),
        "error".into(),
        "bad credentials".into(),
    ]
}

fn default_success() -> Vec<String> {
    vec![
        "dashboard".into(),
        "welcome".into(),
        "logout".into(),
        "success".into(),
        "authenticated".into(),
    ]
}

pub async fn enumerate_http_users(
    url: String,
    username_field: String,
    password_field: String,
    usernames: Vec<String>,
    failure_indicators: Option<Vec<String>>,
) -> Result<Vec<HttpUserEnumResult>, String> {
    if usernames.is_empty() {
        return Err("No usernames to test".to_string());
    }
    if usernames.len() > 100 {
        return Err("Max 100 usernames per HTTP enumeration".to_string());
    }

    let fails = failure_indicators.unwrap_or_else(default_failures);
    let bogus_pass = "FulGul_Enum_!x9z_".to_string();
    let mut baseline_len: Option<usize> = None;
    let mut results = Vec::new();

    for user in usernames {
        let body = format!(
            "{}={}&{}={}",
            urlencoding(&username_field),
            urlencoding(&user),
            urlencoding(&password_field),
            urlencoding(&bogus_pass)
        );
        match http_post(&url, &body, 6).await {
            Ok((status, text)) => {
                if baseline_len.is_none() {
                    baseline_len = Some(text.len());
                }
                let base = baseline_len.unwrap_or(text.len());
                let len_diff = (text.len() as i32 - base as i32).abs();
                let lower = text.to_lowercase();
                let has_fail = fails.iter().any(|f| lower.contains(&f.to_lowercase()));
                let likely_valid = len_diff > 40 || (!has_fail && status == 200 && text.len() != base);
                results.push(HttpUserEnumResult {
                    username: user,
                    likely_valid,
                    status_code: status,
                    response_len: text.len(),
                    detail: if likely_valid {
                        "Response differs from baseline — user may exist".to_string()
                    } else {
                        "Matches invalid-user pattern".to_string()
                    },
                });
            }
            Err(e) => {
                results.push(HttpUserEnumResult {
                    username: user,
                    likely_valid: false,
                    status_code: 0,
                    response_len: 0,
                    detail: e,
                });
            }
        }
        tokio::time::sleep(Duration::from_millis(200)).await;
    }
    Ok(results)
}

pub async fn start_http_bruteforce(params: HttpBruteParams) -> Result<String, String> {
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

    if usernames.len() > 20 {
        return Err("Max 20 usernames per HTTP brute job".to_string());
    }
    if passwords.len() > 5_000 {
        return Err("Max 5,000 passwords per HTTP brute job".to_string());
    }

    let total = (usernames.len() * passwords.len()) as u32;
    let target = params.url.clone();
    let (job_id, stop) = register_job("http", &target, total).await;
    let return_id = job_id.clone();

    if command_exists("hydra").await {
        log_job(&job_id, "hydra available — using HTTP form module.").await;
        tokio::spawn(async move {
            run_http_hydra(&job_id, stop, params, usernames, passwords).await;
        });
    } else {
        log_job(&job_id, "Using built-in HTTP client (reqwest).").await;
        tokio::spawn(async move {
            run_http_native(&job_id, stop, params, usernames, passwords).await;
        });
    }

    Ok(return_id)
}

async fn run_http_hydra(
    job_id: &str,
    stop: Arc<std::sync::atomic::AtomicBool>,
    params: HttpBruteParams,
    usernames: Vec<String>,
    passwords: Vec<String>,
) {
    let user_file = std::env::temp_dir().join(format!("fulgul-http-u-{job_id}.txt"));
    let pass_file = std::env::temp_dir().join(format!("fulgul-http-p-{job_id}.txt"));
    let user_path = user_file.display();
    let pass_path = pass_file.display();
    let _ = tokio::fs::write(&user_file, usernames.join("\n")).await;
    let _ = tokio::fs::write(&pass_file, passwords.join("\n")).await;

    let form = format!(
        "{}:{}^:{}",
        params.username_field,
        "%USER%",
        params.password_field
    );
    let cmd = format!(
        "hydra -L \"{user_path}\" -P \"{pass_path}\" -t 6 -W 2 -f \"{}\" http-post-form \
         \"{}:{}:F=invalid\" 2>&1",
        params.url,
        params.url.trim_start_matches("http://").trim_start_matches("https://"),
        form
    );

    log_job(job_id, "Running hydra http-post-form…").await;
    let total = (usernames.len() * passwords.len()) as u32;
    let handle = tokio::spawn(async move { run_timed_shell(&cmd, 600).await });

    let mut tick = 0u32;
    while !handle.is_finished() {
        if should_stop(&stop, job_id).await {
            finish_job(job_id, "stopped", None).await;
            let _ = tokio::fs::remove_file(&user_file).await;
            let _ = tokio::fs::remove_file(&pass_file).await;
            return;
        }
        tick = tick.saturating_add(1).min(total);
        update_progress(job_id, tick, total, "hydra…").await;
        tokio::time::sleep(Duration::from_secs(2)).await;
    }

    let out = handle.await.ok().and_then(|r| r.ok()).unwrap_or_default();
    log_job(job_id, &out.lines().take(8).collect::<Vec<_>>().join("\n")).await;

    if out.to_lowercase().contains("login:") || out.contains("host:") {
        finish_job(
            job_id,
            "completed",
            Some(BruteJobResult {
                success: true,
                credential: Some(out.lines().last().unwrap_or("see logs").to_string()),
                username: None,
                password: None,
                message: "HTTP credentials found — see job logs".to_string(),
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
                message: "No valid HTTP credentials in wordlists".to_string(),
            }),
        )
        .await;
    }
    let _ = tokio::fs::remove_file(&user_file).await;
    let _ = tokio::fs::remove_file(&pass_file).await;
}

async fn run_http_native(
    job_id: &str,
    stop: Arc<std::sync::atomic::AtomicBool>,
    params: HttpBruteParams,
    usernames: Vec<String>,
    passwords: Vec<String>,
) {
    let fails = params.failure_indicators.clone().unwrap_or_else(default_failures);
    let successes = params.success_indicators.clone().unwrap_or_else(default_success);
    let total = (usernames.len() * passwords.len()) as u32;
    let mut tried = 0u32;

    for user in &usernames {
        for pass in &passwords {
            if should_stop(&stop, job_id).await {
                finish_job(job_id, "stopped", None).await;
                return;
            }
            tried += 1;
            update_progress(job_id, tried, total, &format!("{user}:{pass}")).await;

            let mut body = format!(
                "{}={}&{}={}",
                urlencoding(&params.username_field),
                urlencoding(user),
                urlencoding(&params.password_field),
                urlencoding(pass)
            );
            if let Some(extra) = &params.extra_fields {
                for (k, v) in extra {
                    body.push('&');
                    body.push_str(&format!("{}={}", urlencoding(k), urlencoding(v)));
                }
            }

            match http_post(&params.url, &body, 6).await {
                Ok((status, text)) => {
                    let lower = text.to_lowercase();
                    let is_fail = fails.iter().any(|f| lower.contains(&f.to_lowercase()));
                    let is_success = successes.iter().any(|s| lower.contains(&s.to_lowercase()))
                        || (status == 302 || status == 301)
                        || (status == 200 && !is_fail && text.len() > 50);

                    if is_success && !is_fail {
                        log_job(job_id, &format!("✓ Valid: {user} / {pass} (HTTP {status})")).await;
                        finish_job(
                            job_id,
                            "completed",
                            Some(BruteJobResult {
                                success: true,
                                credential: Some(format!("{user}:{pass}")),
                                username: Some(user.clone()),
                                password: Some(pass.clone()),
                                message: format!("HTTP login accepted (status {status})"),
                            }),
                        )
                        .await;
                        return;
                    }
                }
                Err(e) => {
                    if tried % 25 == 0 {
                        log_job(job_id, &format!("Request error: {e}")).await;
                    }
                    if e.contains("connection") || e.contains("timed out") {
                        // brief pause on network errors
                        tokio::time::sleep(Duration::from_millis(500)).await;
                    }
                }
            }
            tokio::time::sleep(Duration::from_millis(150)).await;
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
            message: "No valid HTTP credentials found".to_string(),
        }),
    )
    .await;
}

async fn http_post(url: &str, body: &str, timeout_secs: u64) -> Result<(u16, String), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .redirect(reqwest::redirect::Policy::limited(3))
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))?;

    let resp = client
        .post(url)
        .header("Content-Type", "application/x-www-form-urlencoded")
        .header("User-Agent", "Fulgul-Pentest/1.0 (authorized)")
        .body(body.to_string())
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {e}"))?;

    let status = resp.status().as_u16();
    let text = resp
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {e}"))?;
    Ok((status, text))
}

fn urlencoding(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            _ => format!("%{:02X}", c as u32),
        })
        .collect()
}
