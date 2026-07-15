use crate::attacks::simulator::AttackSession;
use crate::commands::{AutoResponseSettings, ResponseActivity, ScanResult};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::PathBuf;
use tokio::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoredScanResult {
    #[serde(alias = "scan_id")]
    pub scan_id: String,
    pub timestamp: String,
    pub os: String,
    #[serde(alias = "security_score")]
    pub security_score: u32,
    #[serde(alias = "security_grade")]
    pub security_grade: String,
    pub vulnerabilities: Vec<StoredVulnerability>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoredVulnerability {
    pub id: String,
    pub title: String,
    pub severity: String,
    pub description: String,
    #[serde(alias = "suggested_fix")]
    pub suggested_fix: String,
    pub status: String, // pending | in-progress | fixed | failed
    pub cve: Option<String>,
    #[serde(alias = "affected_systems")]
    pub affected_systems: Vec<String>,
    #[serde(alias = "detected_at")]
    pub detected_at: String,
    pub remediation: String,
}

pub async fn get_storage_dir() -> Result<PathBuf, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("APPDATA"))
        .or_else(|_| std::env::var("LOCALAPPDATA"))
        .map_err(|_| "Failed to get app data directory".to_string())?;

    let storage_dir = PathBuf::from(home).join(".fulgul");
    fs::create_dir_all(&storage_dir).await
        .map_err(|e| format!("Failed to create storage directory: {}", e))?;

    Ok(storage_dir)
}

pub async fn get_scan_history_path() -> Result<PathBuf, String> {
    Ok(get_storage_dir().await?.join("scan_history.json"))
}

pub async fn save_scan_result(scan: &ScanResult) -> Result<(), String> {
    let _path = get_scan_history_path().await?;
    let mut history = load_scan_history().await.unwrap_or_default();

    // Convert ScanResult to StoredScanResult
    let stored_scan = StoredScanResult {
        scan_id: scan.id.clone(),
        timestamp: scan.timestamp.clone(),
        os: scan.os.clone(),
        security_score: scan.security_score,
        security_grade: scan.security_grade.clone(),
        vulnerabilities: scan.vulnerabilities.iter().map(|v| StoredVulnerability {
            id: v.id.clone(),
            title: v.title.clone(),
            severity: v.severity.clone(),
            description: v.description.clone(),
            suggested_fix: v.remediation.clone(),
            status: "pending".to_string(),
            cve: v.cve.clone(),
            affected_systems: v.affected_systems.clone(),
            detected_at: v.detected_at.clone(),
            remediation: v.remediation.clone(),
        }).collect(),
    };

    // Check if scan already exists, update it; otherwise add new
    if let Some(existing) = history.iter_mut().find(|s| s.scan_id == scan.id) {
        *existing = stored_scan;
    } else {
        history.insert(0, stored_scan);
    }

    // Keep only last 100 scans
    if history.len() > 100 {
        history.truncate(100);
    }

    save_scan_history(&history).await
}

pub async fn save_scan_history(history: &[StoredScanResult]) -> Result<(), String> {
    let path = get_scan_history_path().await?;
    let json = serde_json::to_string_pretty(history)
        .map_err(|e| format!("Failed to serialize scan history: {}", e))?;

    fs::write(&path, json).await
        .map_err(|e| format!("Failed to write scan history: {}", e))?;

    Ok(())
}

pub async fn load_scan_history() -> Result<Vec<StoredScanResult>, String> {
    let path = get_scan_history_path().await?;

    if !path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&path).await
        .map_err(|e| format!("Failed to read scan history: {}", e))?;

    let history: Vec<StoredScanResult> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse scan history: {}", e))?;

    Ok(history)
}

pub async fn update_vulnerability_status(
    scan_id: &str,
    vuln_id: &str,
    status: &str,
) -> Result<(), String> {
    let mut history = load_scan_history().await?;

    if let Some(scan) = history.iter_mut().find(|s| s.scan_id == scan_id) {
        if let Some(vuln) = scan.vulnerabilities.iter_mut().find(|v| v.id == vuln_id) {
            vuln.status = status.to_string();
            save_scan_history(&history).await?;
            return Ok(());
        }
        return Err("Vulnerability not found".to_string());
    }
    Err("Scan not found".to_string())
}

pub async fn delete_scan(scan_id: &str) -> Result<(), String> {
    let mut history = load_scan_history().await?;
    history.retain(|s| s.scan_id != scan_id);
    save_scan_history(&history).await
}

pub async fn get_all_vulnerabilities() -> Result<Vec<(StoredVulnerability, String)>, String> {
    let history = load_scan_history().await?;
    let mut all_vulns = Vec::new();

    for scan in history {
        for vuln in scan.vulnerabilities {
            all_vulns.push((vuln, scan.scan_id.clone()));
        }
    }

    Ok(all_vulns)
}

// ── Scan comparison ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScanComparison {
    pub baseline_scan_id: String,
    pub current_scan_id: String,
    pub baseline_score: u32,
    pub current_score: u32,
    pub score_delta: i32,
    pub new_vulnerabilities: Vec<StoredVulnerability>,
    pub resolved_vulnerabilities: Vec<StoredVulnerability>,
    pub unchanged_count: usize,
}

fn vuln_key(v: &StoredVulnerability) -> String {
    if let Some(cve) = &v.cve {
        return format!("cve:{cve}");
    }
    v.title.to_lowercase()
}

pub async fn compare_scans(
    baseline_scan_id: &str,
    current_scan_id: &str,
) -> Result<ScanComparison, String> {
    let history = load_scan_history().await?;
    let baseline = history
        .iter()
        .find(|s| s.scan_id == baseline_scan_id)
        .ok_or_else(|| "Baseline scan not found".to_string())?;
    let current = history
        .iter()
        .find(|s| s.scan_id == current_scan_id)
        .ok_or_else(|| "Current scan not found".to_string())?;

    let baseline_keys: HashSet<String> = baseline.vulnerabilities.iter().map(vuln_key).collect();
    let current_keys: HashSet<String> = current.vulnerabilities.iter().map(vuln_key).collect();

    let new_vulnerabilities: Vec<_> = current
        .vulnerabilities
        .iter()
        .filter(|v| !baseline_keys.contains(&vuln_key(v)))
        .cloned()
        .collect();
    let resolved_vulnerabilities: Vec<_> = baseline
        .vulnerabilities
        .iter()
        .filter(|v| !current_keys.contains(&vuln_key(v)))
        .cloned()
        .collect();
    let unchanged_count = current
        .vulnerabilities
        .iter()
        .filter(|v| baseline_keys.contains(&vuln_key(v)))
        .count();

    Ok(ScanComparison {
        baseline_scan_id: baseline_scan_id.to_string(),
        current_scan_id: current_scan_id.to_string(),
        baseline_score: baseline.security_score,
        current_score: current.security_score,
        score_delta: current.security_score as i32 - baseline.security_score as i32,
        new_vulnerabilities,
        resolved_vulnerabilities,
        unchanged_count,
    })
}

// ── Attack session persistence ───────────────────────────────────────────────

async fn attack_sessions_path() -> Result<PathBuf, String> {
    Ok(get_storage_dir().await?.join("attack_sessions.json"))
}

pub async fn load_attack_sessions() -> Result<Vec<AttackSession>, String> {
    let path = attack_sessions_path().await?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read attack sessions: {e}"))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse attack sessions: {e}"))
}

pub async fn save_attack_sessions(sessions: &[AttackSession]) -> Result<(), String> {
    let path = attack_sessions_path().await?;
    let mut list = sessions.to_vec();
    list.sort_by(|a, b| b.start_time.cmp(&a.start_time));
    if list.len() > 50 {
        list.truncate(50);
    }
    let json = serde_json::to_string_pretty(&list)
        .map_err(|e| format!("Failed to serialize attack sessions: {e}"))?;
    fs::write(&path, json)
        .await
        .map_err(|e| format!("Failed to write attack sessions: {e}"))
}

// ── Auto-response persistence ──────────────────────────────────────────────────

async fn auto_response_settings_path() -> Result<PathBuf, String> {
    Ok(get_storage_dir().await?.join("auto_response_settings.json"))
}

async fn response_activities_path() -> Result<PathBuf, String> {
    Ok(get_storage_dir().await?.join("response_activities.json"))
}

pub async fn load_auto_response_settings() -> Result<AutoResponseSettings, String> {
    let path = auto_response_settings_path().await?;
    if !path.exists() {
        return Ok(AutoResponseSettings {
            auto_patch: false,
            auto_quarantine: false,
            auto_notify: true,
            patch_delay: 60,
            quarantine_threshold: "high".to_string(),
        });
    }
    let content = fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read auto-response settings: {e}"))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse auto-response settings: {e}"))
}

pub async fn save_auto_response_settings(settings: &AutoResponseSettings) -> Result<(), String> {
    let path = auto_response_settings_path().await?;
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {e}"))?;
    fs::write(&path, json)
        .await
        .map_err(|e| format!("Failed to write settings: {e}"))
}

pub async fn load_response_activities() -> Result<Vec<ResponseActivity>, String> {
    let path = response_activities_path().await?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read response activities: {e}"))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse response activities: {e}"))
}

pub async fn save_response_activities(activities: &[ResponseActivity]) -> Result<(), String> {
    let path = response_activities_path().await?;
    let mut list = activities.to_vec();
    if list.len() > 200 {
        list.truncate(200);
    }
    let json = serde_json::to_string_pretty(&list)
        .map_err(|e| format!("Failed to serialize activities: {e}"))?;
    fs::write(&path, json)
        .await
        .map_err(|e| format!("Failed to write activities: {e}"))
}

pub async fn append_response_activity(activity: ResponseActivity) -> Result<(), String> {
    let mut activities = load_response_activities().await.unwrap_or_default();
    activities.insert(0, activity);
    save_response_activities(&activities).await
}

// ── Global search ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub kind: String,
    pub id: String,
    pub title: String,
    pub subtitle: String,
    pub path: String,
}

pub async fn search_security_data(query: &str) -> Result<Vec<SearchHit>, String> {
    let q = query.trim().to_lowercase();
    if q.len() < 2 {
        return Ok(Vec::new());
    }

    let mut hits = Vec::new();

    let history = load_scan_history().await.unwrap_or_default();
    for scan in &history {
        if scan.os.to_lowercase().contains(&q)
            || scan.security_grade.to_lowercase().contains(&q)
            || scan.scan_id.to_lowercase().contains(&q)
        {
            hits.push(SearchHit {
                kind: "scan".to_string(),
                id: scan.scan_id.clone(),
                title: format!("Scan — {}", scan.os),
                subtitle: format!("Score {} · {}", scan.security_score, scan.security_grade),
                path: "/scan-history".to_string(),
            });
        }
        for vuln in &scan.vulnerabilities {
            if vuln.title.to_lowercase().contains(&q)
                || vuln.description.to_lowercase().contains(&q)
                || vuln.severity.to_lowercase().contains(&q)
                || vuln.cve.as_ref().is_some_and(|c| c.to_lowercase().contains(&q))
            {
                hits.push(SearchHit {
                    kind: "vulnerability".to_string(),
                    id: vuln.id.clone(),
                    title: vuln.title.clone(),
                    subtitle: format!("{} · {}", vuln.severity, scan.os),
                    path: format!("/vulnerabilities?scanId={}", scan.scan_id),
                });
            }
        }
    }

    let tasks = crate::hardening::tasks::get_all_hardening_tasks();
    for task in tasks {
        if task.name.to_lowercase().contains(&q)
            || task.description.to_lowercase().contains(&q)
            || task.category.to_lowercase().contains(&q)
        {
            hits.push(SearchHit {
                kind: "hardening".to_string(),
                id: task.id.clone(),
                title: task.name.clone(),
                subtitle: task.category.clone(),
                path: "/hardening".to_string(),
            });
        }
    }

    let scenarios = crate::attacks::scenarios::get_available_scenarios();
    for scenario in scenarios {
        if scenario.name.to_lowercase().contains(&q)
            || scenario.description.to_lowercase().contains(&q)
            || scenario.category.to_lowercase().contains(&q)
        {
            hits.push(SearchHit {
                kind: "scenario".to_string(),
                id: scenario.id.clone(),
                title: scenario.name.clone(),
                subtitle: format!("{} · port {}", scenario.difficulty, scenario.port),
                path: "/attacks".to_string(),
            });
        }
    }

    hits.truncate(20);
    Ok(hits)
}

// ── Security report export ─────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecurityReport {
    pub generated_at: String,
    pub total_scans: usize,
    pub average_score: u32,
    pub total_vulnerabilities: usize,
    pub by_severity: std::collections::HashMap<String, usize>,
    pub recent_scans: Vec<StoredScanResult>,
}

pub async fn build_security_report() -> Result<SecurityReport, String> {
    let history = load_scan_history().await?;
    let total_scans = history.len();
    let average_score = if total_scans > 0 {
        history.iter().map(|s| s.security_score).sum::<u32>() / total_scans as u32
    } else {
        0
    };

    let mut by_severity: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut total_vulnerabilities = 0usize;
    for scan in &history {
        for v in &scan.vulnerabilities {
            total_vulnerabilities += 1;
            *by_severity.entry(v.severity.clone()).or_insert(0) += 1;
        }
    }

    Ok(SecurityReport {
        generated_at: chrono::Utc::now().to_rfc3339(),
        total_scans,
        average_score,
        total_vulnerabilities,
        by_severity,
        recent_scans: history.into_iter().take(10).collect(),
    })
}

