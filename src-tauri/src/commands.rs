use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};


// Attack Simulation Types
#[derive(Debug, Serialize, Deserialize)]
pub struct AttackSimulationResult {
    pub id: String,
    pub timestamp: String,
    #[serde(rename = "attackType")]
    pub attack_type: String,
    pub status: String,
    #[serde(rename = "riskScore")]
    pub risk_score: u32,
    pub logs: Vec<String>,
    pub metrics: AttackMetrics,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AttackMetrics {
    pub duration: u64,
    pub attempts: u32,
    pub blocked: u32,
}

// Re-export HardeningTask from hardening module
pub use crate::hardening::tasks::HardeningTask;

// Vulnerability Types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Vulnerability {
    pub id: String,
    pub title: String,
    pub description: String,
    pub severity: String,
    pub cve: Option<String>,
    #[serde(rename = "affectedSystems")]
    pub affected_systems: Vec<String>,
    #[serde(rename = "detectedAt")]
    pub detected_at: String,
    pub remediation: String,
}

// Auto Response Types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AutoResponseSettings {
    #[serde(rename = "autoPatch")]
    pub auto_patch: bool,
    #[serde(rename = "autoQuarantine")]
    pub auto_quarantine: bool,
    #[serde(rename = "autoNotify")]
    pub auto_notify: bool,
    #[serde(rename = "patchDelay")]
    pub patch_delay: u32,
    #[serde(rename = "quarantineThreshold")]
    pub quarantine_threshold: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ResponseActivity {
    pub id: String,
    pub timestamp: String,
    pub action: String,
    pub target: String,
    pub status: String,
    pub details: String,
}

// Scan Result Types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScanResult {
    pub id: String,
    pub os: String,
    pub timestamp: String,
    pub vulnerabilities: Vec<Vulnerability>,
    #[serde(rename = "openPorts")]
    pub open_ports: Vec<u16>,
    pub services: Option<Vec<String>>,
    #[serde(rename = "securityScore")]
    pub security_score: u32,
    #[serde(rename = "securityGrade")]
    pub security_grade: String,
}

// Tauri Commands

#[tauri::command]
pub async fn simulate_attack() -> Result<AttackSimulationResult, String> {
    // Simulate attack processing delay
    tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;

    let attack_types = vec![
        "SQL Injection",
        "XSS Attack",
        "DDoS Attempt",
        "Brute Force",
        "Malware Injection",
    ];
    use rand::Rng;
    let mut rng = rand::thread_rng();
    
    let attack_type = attack_types[rng.gen_range(0..attack_types.len())];

    let statuses = vec!["success", "blocked", "failed"];
    let status = statuses[rng.gen_range(0..statuses.len())];

    let risk_score = rng.gen_range(0..100);
    let attempts = 10 + rng.gen_range(0..50);
    let blocked = if status == "blocked" {
        attempts
    } else {
        attempts / 2
    };

    let logs = vec![
        format!("[{}] Attack simulation started", get_timestamp()),
        format!("[{}] Scanning for vulnerabilities...", get_timestamp()),
        format!("[{}] Detected {} attack attempts", get_timestamp(), attempts),
        format!("[{}] Blocked {} attempts", get_timestamp(), blocked),
        format!("[{}] Attack simulation completed", get_timestamp()),
    ];

    Ok(AttackSimulationResult {
        id: generate_id(),
        timestamp: get_timestamp(),
        attack_type: attack_type.to_string(),
        status: status.to_string(),
        risk_score,
        logs,
        metrics: AttackMetrics {
            duration: 1500,
            attempts,
            blocked,
        },
    })
}

#[tauri::command]
pub async fn get_hardening_tasks() -> Result<Vec<HardeningTask>, String> {
    // Get all applicable tasks and check their status
    let tasks = crate::hardening::detector::check_all_tasks().await;
    Ok(tasks)
}

#[tauri::command]
pub async fn apply_hardening_task(task_id: String) -> Result<String, String> {
    // Find the task
    let tasks = crate::hardening::detector::get_applicable_tasks().await;
    let task = tasks.iter().find(|t| t.id == task_id)
        .ok_or_else(|| "Task not found".to_string())?;
    
    // Validate task
    crate::hardening::applier::validate_task_before_apply(task)?;
    
    // Return the command to execute (will be executed via terminal)
    if let Some(ref command) = task.command {
        Ok(command.clone())
    } else {
        Err("No command available for this task. Please apply manually.".to_string())
    }
}

#[tauri::command]
pub async fn get_hardening_task_details(task_id: String) -> Result<HardeningTask, String> {
    let tasks = crate::hardening::detector::get_applicable_tasks().await;
    let task = tasks.iter().find(|t| t.id == task_id)
        .ok_or_else(|| "Task not found".to_string())?;
    Ok(task.clone())
}

#[tauri::command]
pub async fn scan_vulnerabilities() -> Result<Vec<Vulnerability>, String> {
    // Simulate scanning delay
    tokio::time::sleep(tokio::time::Duration::from_millis(2000)).await;

    let vulnerabilities = vec![
        Vulnerability {
            id: generate_id(),
            title: "OpenSSL Buffer Overflow (CVE-2023-1234)".to_string(),
            description: "A buffer overflow vulnerability in OpenSSL could allow remote code execution.".to_string(),
            severity: "critical".to_string(),
            cve: Some("CVE-2023-1234".to_string()),
            affected_systems: vec![
                "Server-01".to_string(),
                "Server-02".to_string(),
                "Server-03".to_string(),
            ],
            detected_at: get_timestamp(),
            remediation: "Update OpenSSL to version 3.0.8 or later".to_string(),
        },
        Vulnerability {
            id: generate_id(),
            title: "Weak SSH Key Exchange".to_string(),
            description: "SSH server is using weak key exchange algorithms.".to_string(),
            severity: "high".to_string(),
            cve: None,
            affected_systems: vec!["Server-01".to_string()],
            detected_at: get_timestamp(),
            remediation: "Disable weak algorithms in SSH config".to_string(),
        },
        Vulnerability {
            id: generate_id(),
            title: "Outdated PHP Version".to_string(),
            description: "PHP version 7.4 is no longer supported and may contain security vulnerabilities.".to_string(),
            severity: "medium".to_string(),
            cve: None,
            affected_systems: vec!["Web-Server-01".to_string()],
            detected_at: get_timestamp(),
            remediation: "Upgrade to PHP 8.2 or later".to_string(),
        },
        Vulnerability {
            id: generate_id(),
            title: "Missing Security Headers".to_string(),
            description: "Web application is missing important security headers like CSP and HSTS.".to_string(),
            severity: "medium".to_string(),
            cve: None,
            affected_systems: vec!["Web-Server-01".to_string(), "Web-Server-02".to_string()],
            detected_at: get_timestamp(),
            remediation: "Configure security headers in web server config".to_string(),
        },
        Vulnerability {
            id: generate_id(),
            title: "Weak Password Policy".to_string(),
            description: "System allows weak passwords that are easily guessable.".to_string(),
            severity: "low".to_string(),
            cve: None,
            affected_systems: vec!["All Systems".to_string()],
            detected_at: get_timestamp(),
            remediation: "Enforce strong password policy with minimum requirements".to_string(),
        },
    ];

    Ok(vulnerabilities)
}

fn severity_rank(severity: &str) -> u8 {
    match severity.to_lowercase().as_str() {
        "critical" => 4,
        "high" => 3,
        "medium" => 2,
        "low" => 1,
        _ => 0,
    }
}

fn severity_meets_threshold(severity: &str, threshold: &str) -> bool {
    severity_rank(severity) >= severity_rank(threshold)
}

async fn process_auto_response(scan: &ScanResult) -> Result<(), String> {
    let settings = crate::storage::json_storage::load_auto_response_settings().await?;

    for vuln in &scan.vulnerabilities {
        if settings.auto_notify && severity_meets_threshold(&vuln.severity, "medium") {
            crate::storage::json_storage::append_response_activity(ResponseActivity {
                id: generate_id(),
                timestamp: get_timestamp(),
                action: "notify".to_string(),
                target: vuln.title.clone(),
                status: "success".to_string(),
                details: format!(
                    "Alert: {} ({}) detected on {}",
                    vuln.title, vuln.severity, scan.os
                ),
            })
            .await?;
        }

        if settings.auto_quarantine
            && severity_meets_threshold(&vuln.severity, &settings.quarantine_threshold)
        {
            crate::storage::json_storage::append_response_activity(ResponseActivity {
                id: generate_id(),
                timestamp: get_timestamp(),
                action: "quarantine".to_string(),
                target: vuln.title.clone(),
                status: "pending".to_string(),
                details: format!(
                    "Quarantine recommended for {} — severity {}",
                    vuln.title, vuln.severity
                ),
            })
            .await?;
        }

        if settings.auto_patch && severity_meets_threshold(&vuln.severity, "high") {
            crate::storage::json_storage::append_response_activity(ResponseActivity {
                id: generate_id(),
                timestamp: get_timestamp(),
                action: "patch".to_string(),
                target: vuln.title.clone(),
                status: "pending".to_string(),
                details: format!(
                    "Auto-patch queued (delay {}s): {}",
                    settings.patch_delay, vuln.remediation
                ),
            })
            .await?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_auto_response_settings() -> Result<AutoResponseSettings, String> {
    crate::storage::json_storage::load_auto_response_settings().await
}

#[tauri::command]
pub async fn update_auto_response_settings(
    settings: AutoResponseSettings,
) -> Result<(), String> {
    crate::storage::json_storage::save_auto_response_settings(&settings).await
}

#[tauri::command]
pub async fn get_response_activities() -> Result<Vec<ResponseActivity>, String> {
    crate::storage::json_storage::load_response_activities().await
}

// Scan Commands

#[tauri::command]
pub async fn scan_local_machine() -> Result<ScanResult, String> {
    let result = crate::scanner::local::scan_local_machine().await?;
    
    crate::storage::json_storage::save_scan_result(&result).await?;
    let _ = crate::storage::activity_log::log_scan(&result, false).await;
    let _ = crate::storage::defense_workspace::ingest_scan(&result, false).await;
    let _ = process_auto_response(&result).await;

    Ok(result)
}

#[tauri::command]
pub async fn scan_remote_ip(ip: String) -> Result<ScanResult, String> {
    // Validate IP format
    if ip.parse::<std::net::IpAddr>().is_err() {
        return Err("Invalid IP address format".to_string());
    }
    
    let ip_label = ip.clone();
    let result = crate::scanner::remote::scan_remote_ip(ip).await?;
    
    crate::storage::json_storage::save_scan_result(&result).await?;
    let _ = crate::storage::activity_log::log_scan(&result, true).await;
    let _ = crate::storage::workspace::add_or_update_target(
        &ip_label,
        result.open_ports.clone(),
        result.services.clone().unwrap_or_default(),
        "vuln_scan",
        &format!("Score {}/100 — {} vulns", result.security_score, result.vulnerabilities.len()),
    )
    .await;
    let _ = crate::storage::workspace::set_phase_status("vulnerability", "active").await;
    let _ = crate::storage::defense_workspace::ingest_scan(&result, true).await;
    let _ = process_auto_response(&result).await;

    Ok(result)
}

#[tauri::command]
pub async fn compare_scans(
    baseline_scan_id: String,
    current_scan_id: String,
) -> Result<crate::storage::json_storage::ScanComparison, String> {
    let result =
        crate::storage::json_storage::compare_scans(&baseline_scan_id, &current_scan_id).await?;
    let _ = crate::storage::defense_workspace::set_phase_status("analysis", "active").await;
    Ok(result)
}

#[tauri::command]
pub async fn search_security_data(query: String) -> Result<Vec<crate::storage::json_storage::SearchHit>, String> {
    crate::storage::json_storage::search_security_data(&query).await
}

#[tauri::command]
pub async fn export_security_report() -> Result<String, String> {
    let report = crate::storage::json_storage::build_security_report().await?;
    serde_json::to_string_pretty(&report)
        .map_err(|e| format!("Failed to export report: {e}"))
}

#[tauri::command]
pub async fn get_scan_history() -> Result<Vec<crate::storage::json_storage::StoredScanResult>, String> {
    crate::storage::json_storage::load_scan_history().await
}

#[tauri::command]
pub async fn delete_scan_result(scan_id: String) -> Result<(), String> {
    crate::storage::json_storage::delete_scan(&scan_id).await
}

#[tauri::command]
pub async fn get_all_vulnerabilities() -> Result<Vec<(crate::storage::json_storage::StoredVulnerability, String)>, String> {
    crate::storage::json_storage::get_all_vulnerabilities().await
}

#[tauri::command]
pub async fn get_vulnerabilities_by_scan(scan_id: String) -> Result<Vec<crate::storage::json_storage::StoredVulnerability>, String> {
    let history = crate::storage::json_storage::load_scan_history().await?;
    
    if let Some(scan) = history.iter().find(|s| s.scan_id == scan_id) {
        Ok(scan.vulnerabilities.clone())
    } else {
        Err("Scan not found".to_string())
    }
}

#[tauri::command]
pub async fn update_vulnerability_status(
    scan_id: String,
    vuln_id: String,
    status: String,
) -> Result<(), String> {
    // Validate status
    if !["pending", "in-progress", "fixed", "failed"].contains(&status.as_str()) {
        return Err("Invalid status. Must be: pending, in-progress, fixed, or failed".to_string());
    }
    
    crate::storage::json_storage::update_vulnerability_status(&scan_id, &vuln_id, &status).await?;
    let _ = crate::storage::defense_workspace::set_phase_status("hardening", "active").await;
    Ok(())
}

#[tauri::command]
pub async fn apply_fix(
    scan_id: String,
    vuln_id: String,
) -> Result<String, String> {
    // Get the vulnerability
    let history = crate::storage::json_storage::load_scan_history().await?;
    
    let scan = history.iter()
        .find(|s| s.scan_id == scan_id)
        .ok_or("Scan not found")?;
    
    let vuln = scan.vulnerabilities.iter()
        .find(|v| v.id == vuln_id)
        .ok_or("Vulnerability not found")?;
    
    // Convert to Vulnerability type for fix suggestion
    let vuln_for_fix = Vulnerability {
        id: vuln.id.clone(),
        title: vuln.title.clone(),
        description: vuln.description.clone(),
        severity: vuln.severity.clone(),
        cve: vuln.cve.clone(),
        affected_systems: vuln.affected_systems.clone(),
        detected_at: vuln.detected_at.clone(),
        remediation: vuln.remediation.clone(),
    };
    
    // Update status to in-progress
    crate::storage::json_storage::update_vulnerability_status(&scan_id, &vuln_id, "in-progress").await?;
    
    // Try to apply auto-fix
    match crate::remediation::fixes::apply_auto_fix(&vuln_for_fix).await {
        Ok(message) => {
            // Mark as fixed
            crate::storage::json_storage::update_vulnerability_status(&scan_id, &vuln_id, "fixed").await?;
            Ok(message)
        }
        Err(e) => {
            // Mark as failed if auto-fix not available, otherwise keep in-progress
            if e.contains("cannot be auto-fixed") {
                crate::storage::json_storage::update_vulnerability_status(&scan_id, &vuln_id, "pending").await?;
            } else {
                crate::storage::json_storage::update_vulnerability_status(&scan_id, &vuln_id, "failed").await?;
            }
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn get_fix_suggestion(
    scan_id: String,
    vuln_id: String,
) -> Result<crate::remediation::fixes::FixSuggestion, String> {
    let history = crate::storage::json_storage::load_scan_history().await?;
    
    let scan = history.iter()
        .find(|s| s.scan_id == scan_id)
        .ok_or("Scan not found")?;
    
    let vuln = scan.vulnerabilities.iter()
        .find(|v| v.id == vuln_id)
        .ok_or("Vulnerability not found")?;
    
    let vuln_for_fix = Vulnerability {
        id: vuln.id.clone(),
        title: vuln.title.clone(),
        description: vuln.description.clone(),
        severity: vuln.severity.clone(),
        cve: vuln.cve.clone(),
        affected_systems: vuln.affected_systems.clone(),
        detected_at: vuln.detected_at.clone(),
        remediation: vuln.remediation.clone(),
    };
    
    Ok(crate::remediation::fixes::get_fix_suggestion(&vuln_for_fix))
}

// Helper functions

fn generate_id() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use rand::Rng;
    let mut hasher = DefaultHasher::new();
    SystemTime::now().hash(&mut hasher);
    rand::thread_rng().gen::<u64>().hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

fn get_timestamp() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    chrono::DateTime::from_timestamp(now as i64, 0)
        .unwrap()
        .to_rfc3339()
}

// Attack Hub Commands

use crate::attacks::scenarios::{AttackScenario, AttackStep};
use crate::attacks::simulator::{AttackSession, AttackSimulator, ScenarioProbeResult};
use std::sync::Arc;
use tokio::sync::Mutex;

// Global simulator instance
lazy_static::lazy_static! {
    static ref SIMULATOR: Arc<Mutex<AttackSimulator>> = Arc::new(Mutex::new(AttackSimulator::new()));
    static ref ACTIVE_SESSIONS: Arc<Mutex<std::collections::HashMap<String, AttackSession>>> = Arc::new(Mutex::new(std::collections::HashMap::new()));
    static ref SESSIONS_LOADED: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
}

async fn ensure_attack_sessions_loaded() {
    let mut loaded = SESSIONS_LOADED.lock().await;
    if *loaded {
        return;
    }
    if let Ok(stored) = crate::storage::json_storage::load_attack_sessions().await {
        let mut sessions = ACTIVE_SESSIONS.lock().await;
        for s in stored {
            sessions.entry(s.session_id.clone()).or_insert(s);
        }
    }
    *loaded = true;
}

async fn persist_attack_sessions() {
    let sessions = ACTIVE_SESSIONS.lock().await;
    let list: Vec<AttackSession> = sessions.values().cloned().collect();
    drop(sessions);
    let _ = crate::storage::json_storage::save_attack_sessions(&list).await;
}

async fn maybe_log_completed_session(session_id: &str) {
    let session = {
        let sessions = ACTIVE_SESSIONS.lock().await;
        sessions.get(session_id).cloned()
    };
    if let Some(session) = session {
        if session.status == "completed" {
            let _ = crate::storage::activity_log::log_attack_session(&session).await;
        }
    }
}

#[tauri::command]
pub async fn get_attack_scenarios() -> Result<Vec<AttackScenario>, String> {
    let simulator = SIMULATOR.lock().await;
    Ok(simulator.get_all_scenarios().to_vec())
}

#[tauri::command]
pub async fn start_attack_session(scenario_id: String) -> Result<AttackSession, String> {
    ensure_attack_sessions_loaded().await;
    let simulator = SIMULATOR.lock().await;
    
    // Create a channel for logs
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
    
    // Start the attack
    let session = simulator.start_attack(scenario_id.clone(), tx).await?;
    
    // Store session
    let session_id = session.session_id.clone();
    ACTIVE_SESSIONS.lock().await.insert(session_id.clone(), session.clone());
    
    // Spawn task to collect logs
    let sessions_clone = ACTIVE_SESSIONS.clone();
    tokio::spawn(async move {
        let mut log_count = 0u32;
        while let Some(log) = rx.recv().await {
            if let Some(s) = sessions_clone.lock().await.get_mut(&session_id) {
                s.logs.push(log);
                log_count += 1;
                if log_count % 3 == 0 {
                    persist_attack_sessions().await;
                }
            }
        }
        persist_attack_sessions().await;
    });

    persist_attack_sessions().await;
    Ok(session)
}

#[tauri::command]
pub async fn get_attack_session(session_id: String) -> Result<AttackSession, String> {
    ensure_attack_sessions_loaded().await;
    let sessions = ACTIVE_SESSIONS.lock().await;
    sessions.get(&session_id)
        .cloned()
        .ok_or_else(|| "Session not found".to_string())
}

#[tauri::command]
pub async fn get_attack_sessions() -> Result<Vec<AttackSession>, String> {
    ensure_attack_sessions_loaded().await;
    let sessions = ACTIVE_SESSIONS.lock().await;
    let mut list: Vec<AttackSession> = sessions.values().cloned().collect();
    list.sort_by(|a, b| b.start_time.cmp(&a.start_time));
    Ok(list)
}

fn apply_command_output_to_session(
    session: &mut AttackSession,
    label: &str,
    command: &str,
    output: &str,
) {
    let ts = chrono::Utc::now().format("%H:%M:%S").to_string();
    session.logs.push(format!("[{ts}] {label}: {command}"));
    session.logs.push(format!("[{ts}] Output: {output}"));

    if let Some(idx) = session
        .steps
        .iter()
        .position(|s| !s.completed && s.command.trim() == command.trim())
    {
        session.steps[idx].output = Some(output.to_string());
        if AttackSimulator::step_satisfied(&session.steps[idx], output) {
            let name = session.steps[idx].name.clone();
            session.steps[idx].completed = true;
            session.current_step = session.current_step.saturating_add(1);
            session.score += 50;
            session
                .logs
                .push(format!("[{ts}] Step '{name}' completed (verified from real output)."));
        }
    }

    session.score += AttackSimulator::capture_flags_from_output(output, &mut session.flags_captured);

    if session.steps.iter().all(|s| s.completed) && session.status == "running" {
        session.status = "completed".to_string();
        session.end_time = Some(chrono::Utc::now().to_rfc3339());
        session
            .logs
            .push(format!("[{ts}] All steps completed — session finished."));
    }
}

#[tauri::command]
pub async fn execute_attack_command(
    session_id: String,
    command: String,
) -> Result<String, String> {
    let scenario_id = {
        let sessions = ACTIVE_SESSIONS.lock().await;
        sessions
            .get(&session_id)
            .map(|s| s.scenario_id.clone())
            .ok_or_else(|| "Session not found".to_string())?
    };

    let simulator = SIMULATOR.lock().await;
    let output = simulator
        .execute_command(&scenario_id, &command)
        .await?;

    let mut sessions = ACTIVE_SESSIONS.lock().await;
    if let Some(s) = sessions.get_mut(&session_id) {
        apply_command_output_to_session(s, "Command", &command, &output);
    }
    persist_attack_sessions().await;
    maybe_log_completed_session(&session_id).await;

    Ok(output)
}

#[tauri::command]
pub async fn run_attack_step(session_id: String, step_id: String) -> Result<AttackStep, String> {
    let (scenario_id, command, step_name) = {
        let sessions = ACTIVE_SESSIONS.lock().await;
        let session = sessions
            .get(&session_id)
            .ok_or_else(|| "Session not found".to_string())?;
        if session.status != "running" {
            return Err("Session is not running".to_string());
        }
        let step = session
            .steps
            .iter()
            .find(|s| s.id == step_id)
            .ok_or_else(|| "Step not found".to_string())?;
        if step.completed {
            return Err("Step already completed".to_string());
        }
        (
            session.scenario_id.clone(),
            step.command.clone(),
            step.name.clone(),
        )
    };

    let simulator = SIMULATOR.lock().await;
    let output = simulator
        .execute_command(&scenario_id, &command)
        .await?;

    let mut sessions = ACTIVE_SESSIONS.lock().await;
    let step = if let Some(s) = sessions.get_mut(&session_id) {
        let ts = chrono::Utc::now().format("%H:%M:%S").to_string();
        s.logs.push(format!("[{ts}] Step '{step_name}': {command}"));
        s.logs.push(format!("[{ts}] Output: {output}"));

        if let Some(idx) = s.steps.iter().position(|st| st.id == step_id) {
            s.steps[idx].output = Some(output.clone());
            if AttackSimulator::step_satisfied(&s.steps[idx], &output) {
                s.steps[idx].completed = true;
                s.current_step = s.current_step.saturating_add(1);
                s.score += 50;
                s.logs.push(format!(
                    "[{ts}] Step '{step_name}' completed (verified from real output)."
                ));
            } else {
                s.logs.push(format!(
                    "[{ts}] Step '{step_name}' ran — review output; goal not auto-verified yet."
                ));
            }
        }

        s.score += AttackSimulator::capture_flags_from_output(&output, &mut s.flags_captured);

        if s.steps.iter().all(|st| st.completed) && s.status == "running" {
            s.status = "completed".to_string();
            s.end_time = Some(chrono::Utc::now().to_rfc3339());
            s.logs
                .push(format!("[{ts}] All steps completed — session finished."));
        }

        s.steps
            .iter()
            .find(|st| st.id == step_id)
            .cloned()
            .ok_or_else(|| "Step not found after update".to_string())?
    } else {
        return Err("Session not found".to_string());
    };

    persist_attack_sessions().await;
    maybe_log_completed_session(&session_id).await;
    Ok(step)
}

#[tauri::command]
pub async fn probe_scenario_target(scenario_id: String) -> Result<ScenarioProbeResult, String> {
    AttackSimulator::probe_scenario_target(&scenario_id).await
}

#[tauri::command]
pub async fn complete_attack_step(
    session_id: String,
    step_id: String,
) -> Result<(), String> {
    let mut sessions = ACTIVE_SESSIONS.lock().await;
    let session = sessions.get_mut(&session_id)
        .ok_or_else(|| "Session not found".to_string())?;
    
    if let Some(step) = session.steps.iter_mut().find(|s| s.id == step_id) {
        step.completed = true;
        session.current_step += 1;
        session.score += 50;
    }
    persist_attack_sessions().await;
    Ok(())
}

#[tauri::command]
pub async fn stop_attack_session(session_id: String) -> Result<(), String> {
    let mut sessions = ACTIVE_SESSIONS.lock().await;
    if let Some(session) = sessions.get_mut(&session_id) {
        session.status = "completed".to_string();
        session.end_time = Some(chrono::Utc::now().to_rfc3339());
    }
    persist_attack_sessions().await;
    maybe_log_completed_session(&session_id).await;
    Ok(())
}

// Credential testing (authorized pentest workflows)

#[tauri::command]
pub async fn scan_wifi_networks(
) -> Result<Vec<crate::attacks::bruteforce::wifi::WifiNetwork>, String> {
    crate::attacks::bruteforce::wifi::scan_wifi_networks().await
}

#[tauri::command]
pub async fn list_wordlists(
) -> Result<Vec<crate::attacks::bruteforce::wordlists::WordlistInfo>, String> {
    crate::attacks::bruteforce::wordlists::list_wordlists().await
}

#[tauri::command]
pub async fn save_wordlist(name: String, content: String) -> Result<crate::attacks::bruteforce::wordlists::WordlistInfo, String> {
    crate::attacks::bruteforce::wordlists::save_wordlist(&name, &content).await
}

#[tauri::command]
pub async fn delete_wordlist(id: String) -> Result<(), String> {
    crate::attacks::bruteforce::wordlists::delete_wordlist(&id).await
}

#[tauri::command]
pub async fn preview_wordlist(id: String, limit: Option<usize>) -> Result<Vec<String>, String> {
    crate::attacks::bruteforce::wordlists::preview_wordlist(&id, limit.unwrap_or(15)).await
}

#[tauri::command]
pub async fn enumerate_ssh_users(
    host: String,
    port: Option<u16>,
    usernames: Vec<String>,
) -> Result<Vec<crate::attacks::bruteforce::ssh::UserEnumResult>, String> {
    let port = port.unwrap_or(22);
    let target = format!("{host}:{port}");
    let results =
        crate::attacks::bruteforce::ssh::enumerate_ssh_users(host, port, usernames.clone()).await?;
    let valid = results.iter().filter(|r| r.likely_valid).count();
    let _ = crate::storage::activity_log::log_user_enum(
        "ssh",
        &target,
        valid,
        results.len(),
        serde_json::to_value(&results).unwrap_or_default(),
    )
    .await;
    Ok(results)
}

#[tauri::command]
pub async fn enumerate_http_users(
    url: String,
    username_field: String,
    password_field: String,
    usernames: Vec<String>,
    failure_indicators: Option<Vec<String>>,
) -> Result<Vec<crate::attacks::bruteforce::http::HttpUserEnumResult>, String> {
    let results = crate::attacks::bruteforce::http::enumerate_http_users(
        url.clone(),
        username_field,
        password_field,
        usernames.clone(),
        failure_indicators,
    )
    .await?;
    let valid = results.iter().filter(|r| r.likely_valid).count();
    let _ = crate::storage::activity_log::log_user_enum(
        "http",
        &url,
        valid,
        results.len(),
        serde_json::to_value(&results).unwrap_or_default(),
    )
    .await;
    Ok(results)
}

#[tauri::command]
pub async fn start_wifi_bruteforce(
    ssid: String,
    wordlist_id: String,
    bssid: Option<String>,
) -> Result<String, String> {
    crate::attacks::bruteforce::wifi::start_wifi_bruteforce(ssid, wordlist_id, bssid).await
}

#[tauri::command]
pub async fn start_ssh_bruteforce(
    params: crate::attacks::bruteforce::ssh::SshBruteParams,
) -> Result<String, String> {
    crate::attacks::bruteforce::ssh::start_ssh_bruteforce(params).await
}

#[tauri::command]
pub async fn start_http_bruteforce(
    params: crate::attacks::bruteforce::http::HttpBruteParams,
) -> Result<String, String> {
    crate::attacks::bruteforce::http::start_http_bruteforce(params).await
}

#[tauri::command]
pub async fn get_brute_job(job_id: String) -> Result<crate::attacks::bruteforce::jobs::BruteJob, String> {
    crate::attacks::bruteforce::jobs::get_job(&job_id).await
}

#[tauri::command]
pub async fn list_brute_jobs() -> Result<Vec<crate::attacks::bruteforce::jobs::BruteJob>, String> {
    Ok(crate::attacks::bruteforce::jobs::list_jobs().await)
}

#[tauri::command]
pub async fn stop_brute_job(job_id: String) -> Result<(), String> {
    crate::attacks::bruteforce::jobs::stop_job(&job_id).await
}

#[tauri::command]
pub async fn check_ssh_target(host: String, port: Option<u16>) -> Result<String, String> {
    crate::attacks::bruteforce::ssh::check_ssh_reachable(&host, port.unwrap_or(22)).await
}

// Recon & reporting

#[tauri::command]
pub async fn run_recon_dns(domain: String) -> Result<crate::attacks::recon::ReconResult, String> {
    let result = crate::attacks::recon::recon_dns(&domain).await?;
    let _ = crate::storage::workspace::ingest_recon(&result).await;
    let _ = crate::storage::activity_log::log_recon(&result).await;
    Ok(result)
}

#[tauri::command]
pub async fn run_recon_ssl(host: String, port: Option<u16>) -> Result<crate::attacks::recon::ReconResult, String> {
    let result = crate::attacks::recon::recon_ssl(&host, port.unwrap_or(443)).await?;
    let _ = crate::storage::workspace::ingest_recon(&result).await;
    let _ = crate::storage::activity_log::log_recon(&result).await;
    Ok(result)
}

#[tauri::command]
pub async fn run_recon_http_headers(url: String) -> Result<crate::attacks::recon::ReconResult, String> {
    let result = crate::attacks::recon::recon_http_headers(&url).await?;
    let _ = crate::storage::workspace::ingest_recon(&result).await;
    let _ = crate::storage::activity_log::log_recon(&result).await;
    Ok(result)
}

#[tauri::command]
pub async fn run_recon_banner(
    host: String,
    port: Option<u16>,
) -> Result<crate::attacks::recon::ReconResult, String> {
    let result = crate::attacks::recon::recon_port_banner(&host, port.unwrap_or(80)).await?;
    let _ = crate::storage::workspace::ingest_recon(&result).await;
    let _ = crate::storage::activity_log::log_recon(&result).await;
    Ok(result)
}

#[tauri::command]
pub async fn run_recon_whois(domain: String) -> Result<crate::attacks::recon::ReconResult, String> {
    let result = crate::attacks::recon::recon_whois(&domain).await?;
    let _ = crate::storage::workspace::ingest_recon(&result).await;
    let _ = crate::storage::activity_log::log_recon(&result).await;
    Ok(result)
}

#[tauri::command]
pub async fn list_pentest_activities(
    category: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<crate::storage::activity_log::PentestActivity>, String> {
    crate::storage::activity_log::list_activities(category, limit).await
}

#[tauri::command]
pub async fn get_pentest_activity(id: String) -> Result<crate::storage::activity_log::PentestActivity, String> {
    crate::storage::activity_log::get_activity(&id).await
}

#[tauri::command]
pub async fn delete_pentest_activity(id: String) -> Result<(), String> {
    crate::storage::activity_log::delete_activity(&id).await
}

#[tauri::command]
pub async fn add_pentest_note(
    title: String,
    content: String,
    target: Option<String>,
) -> Result<crate::storage::activity_log::PentestActivity, String> {
    crate::storage::activity_log::log_manual_note(title, content, target).await
}

#[tauri::command]
pub async fn list_pentest_reports() -> Result<Vec<crate::storage::reports::PentestReport>, String> {
    crate::storage::reports::list_reports().await
}

#[tauri::command]
pub async fn get_pentest_report(id: String) -> Result<crate::storage::reports::PentestReport, String> {
    crate::storage::reports::get_report(&id).await
}

#[tauri::command]
pub async fn create_pentest_report(
    title: String,
    client: String,
    tester: String,
    scope: String,
    executive_summary: String,
    activity_ids: Vec<String>,
    engagement_id: Option<String>,
) -> Result<crate::storage::reports::PentestReport, String> {
    crate::storage::reports::create_report(
        title,
        client,
        tester,
        scope,
        executive_summary,
        activity_ids,
        engagement_id,
    )
    .await
}

#[tauri::command]
pub async fn update_pentest_report(
    report: crate::storage::reports::PentestReport,
) -> Result<crate::storage::reports::PentestReport, String> {
    crate::storage::reports::update_report(report).await
}

#[tauri::command]
pub async fn delete_pentest_report(id: String) -> Result<(), String> {
    crate::storage::reports::delete_report(&id).await
}

#[tauri::command]
pub async fn export_pentest_report_markdown(id: String) -> Result<String, String> {
    crate::storage::reports::generate_markdown(&id).await
}

#[tauri::command]
pub async fn export_pentest_report_html(id: String) -> Result<String, String> {
    crate::storage::reports::generate_html(&id).await
}

#[tauri::command]
pub async fn sync_report_activities(id: String) -> Result<crate::storage::reports::PentestReport, String> {
    crate::storage::reports::import_all_activities_to_report(&id).await
}

#[tauri::command]
pub async fn export_pentest_report_pdf(id: String) -> Result<Vec<u8>, String> {
    crate::storage::reports::generate_pdf(&id).await
}

// Engagement & workspace

#[tauri::command]
pub async fn list_engagements() -> Result<Vec<crate::storage::engagements::Engagement>, String> {
    crate::storage::engagements::list_engagements().await
}

#[tauri::command]
pub async fn get_engagement(id: String) -> Result<crate::storage::engagements::Engagement, String> {
    crate::storage::engagements::get_engagement(&id).await
}

#[tauri::command]
pub async fn create_engagement(
    name: String,
    client: String,
    scope_targets: Vec<String>,
    authorized_by: String,
    authorization_ref: String,
) -> Result<crate::storage::engagements::Engagement, String> {
    let eng = crate::storage::engagements::create_engagement(
        name,
        client,
        scope_targets,
        authorized_by,
        authorization_ref,
    )
    .await?;
    let _ = crate::storage::engagements::set_active_engagement(Some(eng.id.clone())).await;
    let _ = crate::storage::workspace::sync_engagement_to_workspace(Some(eng.id.clone())).await;
    let _ = crate::storage::workspace::set_phase_status("planning", "active").await;
    Ok(eng)
}

#[tauri::command]
pub async fn update_engagement(
    engagement: crate::storage::engagements::Engagement,
) -> Result<crate::storage::engagements::Engagement, String> {
    crate::storage::engagements::update_engagement(engagement).await
}

#[tauri::command]
pub async fn delete_engagement(id: String) -> Result<(), String> {
    crate::storage::engagements::delete_engagement(&id).await
}

#[tauri::command]
pub async fn get_active_engagement() -> Result<crate::storage::engagements::ActiveEngagement, String> {
    crate::storage::engagements::get_active_engagement().await
}

#[tauri::command]
pub async fn set_active_engagement(
    engagement_id: Option<String>,
) -> Result<crate::storage::engagements::ActiveEngagement, String> {
    let active = crate::storage::engagements::set_active_engagement(engagement_id.clone()).await?;
    let _ = crate::storage::workspace::sync_engagement_to_workspace(engagement_id.clone()).await;
    let _ = crate::storage::defense_workspace::sync_engagement(engagement_id).await;
    Ok(active)
}

#[tauri::command]
pub async fn get_pentest_workspace() -> Result<crate::storage::workspace::PentestWorkspace, String> {
    crate::storage::workspace::get_workspace().await
}

#[tauri::command]
pub async fn update_pentest_workspace(
    workspace: crate::storage::workspace::PentestWorkspace,
) -> Result<crate::storage::workspace::PentestWorkspace, String> {
    crate::storage::workspace::update_workspace(workspace).await
}

#[tauri::command]
pub async fn set_workspace_primary_target(target: String) -> Result<crate::storage::workspace::PentestWorkspace, String> {
    crate::storage::workspace::set_primary_target(target).await
}

#[tauri::command]
pub async fn get_pipeline_summary() -> Result<crate::storage::workspace::PipelineSummary, String> {
    crate::storage::workspace::get_pipeline_summary().await
}

// Defense workspace & pipeline

#[tauri::command]
pub async fn get_defense_workspace() -> Result<crate::storage::defense_workspace::DefenseWorkspace, String> {
    crate::storage::defense_workspace::get_workspace().await
}

#[tauri::command]
pub async fn update_defense_workspace(
    workspace: crate::storage::defense_workspace::DefenseWorkspace,
) -> Result<crate::storage::defense_workspace::DefenseWorkspace, String> {
    crate::storage::defense_workspace::update_workspace(workspace).await
}

#[tauri::command]
pub async fn set_defense_primary_asset(asset: String) -> Result<crate::storage::defense_workspace::DefenseWorkspace, String> {
    crate::storage::defense_workspace::set_primary_asset(asset).await
}

#[tauri::command]
pub async fn add_defense_asset(
    hostname: String,
    ip: Option<String>,
    criticality: String,
    owner: String,
    notes: Option<String>,
) -> Result<crate::storage::defense_workspace::DefenseAsset, String> {
    crate::storage::defense_workspace::add_manual_asset(hostname, ip, criticality, owner, notes).await
}

#[tauri::command]
pub async fn add_defense_network(cidr: String) -> Result<crate::storage::defense_workspace::DefenseWorkspace, String> {
    crate::storage::defense_workspace::add_protected_network(&cidr).await
}

#[tauri::command]
pub async fn get_defense_pipeline_summary(
) -> Result<crate::storage::defense_workspace::DefensePipelineSummary, String> {
    crate::storage::defense_workspace::get_pipeline_summary().await
}

// Loot vault

#[tauri::command]
pub async fn list_loot(
    engagement_id: Option<String>,
    kind: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<crate::storage::loot::LootItem>, String> {
    crate::storage::loot::list_loot(engagement_id, kind, limit).await
}

#[tauri::command]
pub async fn add_manual_loot(
    kind: String,
    title: String,
    value: String,
    target: String,
    notes: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<crate::storage::loot::LootItem, String> {
    let item = crate::storage::loot::add_manual_loot(kind, title, value, target, notes, tags).await?;
    let _ = crate::storage::workspace::set_phase_status("post_exploit", "active").await;
    Ok(item)
}

#[tauri::command]
pub async fn delete_loot_item(id: String) -> Result<(), String> {
    crate::storage::loot::delete_loot_item(&id).await
}

#[tauri::command]
pub async fn update_loot_item(
    item: crate::storage::loot::LootItem,
) -> Result<crate::storage::loot::LootItem, String> {
    crate::storage::loot::update_loot_item(item).await
}

// Enumeration

#[tauri::command]
pub async fn run_enum_port_sweep(host: String) -> Result<crate::attacks::recon::ReconResult, String> {
    let result = crate::attacks::enumeration::port_sweep(&host).await?;
    let _ = crate::storage::activity_log::log_enumeration(&result).await;
    Ok(result)
}

#[tauri::command]
pub async fn run_enum_subdomains(domain: String) -> Result<crate::attacks::recon::ReconResult, String> {
    let result = crate::attacks::enumeration::subdomain_enum(&domain).await?;
    let _ = crate::storage::activity_log::log_enumeration(&result).await;
    Ok(result)
}

#[tauri::command]
pub async fn run_enum_web_paths(url: String) -> Result<crate::attacks::recon::ReconResult, String> {
    let result = crate::attacks::enumeration::web_path_enum(&url).await?;
    let _ = crate::storage::activity_log::log_enumeration(&result).await;
    Ok(result)
}

#[tauri::command]
pub async fn run_enum_service_banner(
    host: String,
    port: Option<u16>,
) -> Result<crate::attacks::recon::ReconResult, String> {
    let result = crate::attacks::enumeration::service_enum(&host, port.unwrap_or(80)).await?;
    let _ = crate::storage::activity_log::log_enumeration(&result).await;
    let _ = crate::storage::activity_log::log_recon(&result).await;
    Ok(result)
}

// Terminal Commands

#[tauri::command]
pub async fn start_command_execution(
    command: String,
    password: Option<String>,
) -> Result<String, String> {
    let final_command = if command.contains("sudo") && password.is_some() {
        let pwd = password.unwrap();
        format!(
            "echo '{}' | sudo -S {}",
            pwd,
            command.replace("sudo", "").trim()
        )
    } else {
        command.clone()
    };

    crate::terminal::session::start_session(command, final_command).await
}

#[tauri::command]
pub async fn get_command_output(session_id: String) -> Result<serde_json::Value, String> {
    if let Some(session) = crate::terminal::session::get_session(&session_id).await {
        Ok(serde_json::json!({
            "output": session.output,
            "status": session.status,
            "exitCode": session.exit_code,
            "command": session.command,
        }))
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub async fn execute_command_interactive(command: String) -> Result<String, String> {
    crate::terminal::runner::run_command(&command, 120).await
}

