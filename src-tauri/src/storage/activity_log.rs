use crate::attacks::bruteforce::jobs::BruteJob;
use crate::attacks::recon::ReconResult;
use crate::attacks::simulator::AttackSession;
use crate::commands::ScanResult;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::path::PathBuf;
use tokio::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PentestActivity {
    pub id: String,
    pub timestamp: String,
    pub category: String,
    pub kind: String,
    pub title: String,
    pub target: String,
    pub status: String,
    pub severity: String,
    pub summary: String,
    pub details: Value,
    pub tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub engagement_id: Option<String>,
}

async fn activities_dir() -> Result<PathBuf, String> {
    let dir = crate::storage::json_storage::get_storage_dir()
        .await?
        .join("activities");
    fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("Failed to create activities directory: {e}"))?;
    Ok(dir)
}

async fn index_path() -> Result<PathBuf, String> {
    Ok(crate::storage::json_storage::get_storage_dir()
        .await?
        .join("pentest_activities_index.json"))
}

fn new_id(prefix: &str) -> String {
    format!("{prefix}-{}", chrono::Utc::now().timestamp_millis())
}

async fn load_index() -> Result<Vec<PentestActivity>, String> {
    let path = index_path().await?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read activity index: {e}"))?;
    if content.trim().is_empty() {
        return Ok(Vec::new());
    }
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse activity index: {e}"))
}

async fn save_index(activities: &[PentestActivity]) -> Result<(), String> {
    let path = index_path().await?;
    let content = serde_json::to_string_pretty(activities)
        .map_err(|e| format!("Failed to serialize activities: {e}"))?;
    fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write activity index: {e}"))
}

async fn save_activity_file(activity: &PentestActivity) -> Result<(), String> {
    let dir = activities_dir().await?;
    let path = dir.join(format!("{}.json", activity.id));
    let content = serde_json::to_string_pretty(activity)
        .map_err(|e| format!("Failed to serialize activity: {e}"))?;
    fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write activity file: {e}"))
}

async fn source_exists(source_id: &str) -> Result<bool, String> {
    let activities = load_index().await?;
    Ok(activities.iter().any(|a| {
        a.details
            .get("sourceId")
            .and_then(|v| v.as_str())
            .map(|s| s == source_id)
            .unwrap_or(false)
    }))
}

async fn current_engagement_id() -> Option<String> {
    crate::storage::engagements::active_engagement_id().await
}

pub async fn log_activity(mut activity: PentestActivity) -> Result<PentestActivity, String> {
    if activity.engagement_id.is_none() {
        activity.engagement_id = current_engagement_id().await;
    }
    if let Some(source_id) = activity.details.get("sourceId").and_then(|v| v.as_str()) {
        if source_exists(source_id).await? {
            let activities = load_index().await?;
            if let Some(existing) = activities
                .iter()
                .find(|a| a.details.get("sourceId").and_then(|v| v.as_str()) == Some(source_id))
            {
                return Ok(existing.clone());
            }
        }
    }

    save_activity_file(&activity).await?;

    let mut index = load_index().await?;
    index.insert(0, activity.clone());
    if index.len() > 500 {
        let removed: Vec<_> = index.drain(500..).map(|a| a.id).collect();
        let dir = activities_dir().await?;
        for id in removed {
            let _ = fs::remove_file(dir.join(format!("{id}.json"))).await;
        }
    }
    save_index(&index).await?;
    Ok(activity)
}

pub async fn list_activities(
    category: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<PentestActivity>, String> {
    let mut activities = load_index().await?;
    if let Some(cat) = category.filter(|c| !c.is_empty() && c != "all") {
        activities.retain(|a| a.category == cat);
    }
    let cap = limit.unwrap_or(200);
    activities.truncate(cap);
    Ok(activities)
}

pub async fn get_activity(id: &str) -> Result<PentestActivity, String> {
    let dir = activities_dir().await?;
    let path = dir.join(format!("{id}.json"));
    if !path.exists() {
        return Err("Activity not found".to_string());
    }
    let content = fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read activity: {e}"))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse activity: {e}"))
}

pub async fn delete_activity(id: &str) -> Result<(), String> {
    let dir = activities_dir().await?;
    let path = dir.join(format!("{id}.json"));
    if path.exists() {
        fs::remove_file(&path)
            .await
            .map_err(|e| format!("Failed to delete activity file: {e}"))?;
    }
    let mut index = load_index().await?;
    index.retain(|a| a.id != id);
    save_index(&index).await
}

pub async fn log_scan(scan: &ScanResult, remote: bool) -> Result<(), String> {
    let kind = if remote { "remote_scan" } else { "local_scan" };
    let category = "scan";
    let crit = scan
        .vulnerabilities
        .iter()
        .filter(|v| v.severity == "critical")
        .count();
    let high = scan
        .vulnerabilities
        .iter()
        .filter(|v| v.severity == "high")
        .count();
    let severity = if crit > 0 {
        "critical"
    } else if high > 0 {
        "high"
    } else if !scan.vulnerabilities.is_empty() {
        "medium"
    } else {
        "info"
    };

    let target = if remote {
        scan.os.clone()
    } else {
        "localhost".to_string()
    };

    let activity = PentestActivity {
        id: new_id("act"),
        timestamp: scan.timestamp.clone(),
        category: category.to_string(),
        kind: kind.to_string(),
        title: if remote {
            format!("Remote scan — {}", target)
        } else {
            "Local security scan".to_string()
        },
        target: target.clone(),
        status: "success".to_string(),
        severity: severity.to_string(),
        summary: format!(
            "Score {}/100 ({}) — {} findings, {} open ports",
            scan.security_score,
            scan.security_grade,
            scan.vulnerabilities.len(),
            scan.open_ports.len()
        ),
        details: json!({
            "sourceId": scan.id,
            "securityScore": scan.security_score,
            "securityGrade": scan.security_grade,
            "openPorts": scan.open_ports,
            "services": scan.services,
            "vulnerabilities": scan.vulnerabilities,
            "os": scan.os,
        }),
        tags: vec![
            "scan".to_string(),
            if remote { "remote" } else { "local" }.to_string(),
        ],
        engagement_id: None,
    };
    let _ = log_activity(activity).await?;
    Ok(())
}

pub async fn log_brute_job(job: &BruteJob) -> Result<(), String> {
    let success = job.result.as_ref().map(|r| r.success).unwrap_or(false);
    let status = if job.status == "stopped" {
        "stopped"
    } else if success {
        "success"
    } else {
        "failed"
    };
    let severity = if success { "critical" } else { "medium" };

    let summary = job
        .result
        .as_ref()
        .map(|r| r.message.clone())
        .unwrap_or_else(|| format!("{} brute finished ({})", job.kind, job.status));

    let activity = PentestActivity {
        id: new_id("act"),
        timestamp: job.finished_at.clone().unwrap_or_else(|| job.started_at.clone()),
        category: "credential".to_string(),
        kind: format!("{}_brute", job.kind),
        title: format!("{} brute — {}", job.kind.to_uppercase(), job.target),
        target: job.target.clone(),
        status: status.to_string(),
        severity: severity.to_string(),
        summary,
        details: json!({
            "sourceId": job.job_id,
            "jobKind": job.kind,
            "progress": job.progress,
            "result": job.result,
            "logs": job.logs.iter().rev().take(50).collect::<Vec<_>>(),
        }),
        tags: vec!["credential".to_string(), "brute-force".to_string(), job.kind.clone()],
        engagement_id: None,
    };
    let _ = log_activity(activity).await?;
    let _ = crate::storage::loot::capture_from_brute_job(job).await;
    Ok(())
}

pub async fn log_attack_session(session: &AttackSession) -> Result<(), String> {
    if session.status != "completed" {
        return Ok(());
    }

    let completed_steps = session.steps.iter().filter(|s| s.completed).count();
    let activity = PentestActivity {
        id: new_id("act"),
        timestamp: session.end_time.clone().unwrap_or_else(|| session.start_time.clone()),
        category: "attack".to_string(),
        kind: "attack_lab".to_string(),
        title: format!("Attack Lab — {}", session.scenario_id),
        target: session.scenario_id.clone(),
        status: if completed_steps == session.steps.len() {
            "success"
        } else {
            "partial"
        }
        .to_string(),
        severity: if session.flags_captured.is_empty() {
            "medium"
        } else {
            "high"
        }
        .to_string(),
        summary: format!(
            "Score {} — {}/{} steps, {} flags",
            session.score,
            completed_steps,
            session.steps.len(),
            session.flags_captured.len()
        ),
        details: json!({
            "sourceId": session.session_id,
            "scenarioId": session.scenario_id,
            "score": session.score,
            "flagsCaptured": session.flags_captured,
            "steps": session.steps,
            "logs": session.logs.iter().rev().take(40).collect::<Vec<_>>(),
        }),
        tags: vec!["attack-lab".to_string(), "scenario".to_string()],
        engagement_id: None,
    };
    let _ = log_activity(activity).await?;
    let _ = crate::storage::loot::capture_from_attack_session(session).await;
    Ok(())
}

pub async fn log_recon(result: &ReconResult) -> Result<PentestActivity, String> {
    let severity = result
        .findings
        .iter()
        .map(|f| f.severity.as_str())
        .max_by_key(|s| match *s {
            "critical" => 4,
            "high" => 3,
            "medium" => 2,
            "low" => 1,
            _ => 0,
        })
        .unwrap_or("info");

    let activity = PentestActivity {
        id: new_id("act"),
        timestamp: chrono::Utc::now().to_rfc3339(),
        category: "recon".to_string(),
        kind: result.kind.clone(),
        title: format!("Recon — {} ({})", result.kind, result.target),
        target: result.target.clone(),
        status: if result.success {
            "success"
        } else {
            "failed"
        }
        .to_string(),
        severity: severity.to_string(),
        summary: if result.findings.is_empty() {
            format!("{} recon completed", result.kind)
        } else {
            format!("{} findings from {} recon", result.findings.len(), result.kind)
        },
        details: json!({
            "sourceId": format!("recon-{}-{}", result.kind, chrono::Utc::now().timestamp_millis()),
            "findings": result.findings,
            "rawOutput": result.raw_output,
            "durationMs": result.duration_ms,
        }),
        tags: vec!["recon".to_string(), result.kind.clone()],
        engagement_id: None,
    };
    log_activity(activity).await
}

pub async fn log_user_enum(
    kind: &str,
    target: &str,
    valid_count: usize,
    total: usize,
    results: Value,
) -> Result<(), String> {
    let activity = PentestActivity {
        id: new_id("act"),
        timestamp: chrono::Utc::now().to_rfc3339(),
        category: "credential".to_string(),
        kind: format!("{kind}_enum"),
        title: format!("User enumeration — {target}"),
        target: target.to_string(),
        status: if valid_count > 0 {
            "success"
        } else {
            "info"
        }
        .to_string(),
        severity: if valid_count > 0 { "high" } else { "info" }.to_string(),
        summary: format!("{valid_count} likely valid of {total} tested"),
        details: json!({
            "sourceId": format!("enum-{kind}-{}", chrono::Utc::now().timestamp_millis()),
            "validCount": valid_count,
            "totalTested": total,
            "results": results,
        }),
        tags: vec!["credential".to_string(), "enumeration".to_string(), kind.to_string()],
        engagement_id: None,
    };
    let _ = log_activity(activity).await?;
    Ok(())
}

pub async fn log_manual_note(
    title: String,
    content: String,
    target: Option<String>,
) -> Result<PentestActivity, String> {
    let activity = PentestActivity {
        id: new_id("act"),
        timestamp: chrono::Utc::now().to_rfc3339(),
        category: "notes".to_string(),
        kind: "manual_note".to_string(),
        title,
        target: target.unwrap_or_else(|| "engagement".to_string()),
        status: "info".to_string(),
        severity: "info".to_string(),
        summary: content.chars().take(120).collect(),
        details: json!({
            "sourceId": format!("note-{}", chrono::Utc::now().timestamp_millis()),
            "content": content,
        }),
        tags: vec!["notes".to_string(), "manual".to_string()],
        engagement_id: None,
    };
    log_activity(activity).await
}

pub async fn log_enumeration(result: &crate::attacks::recon::ReconResult) -> Result<PentestActivity, String> {
    let severity = result
        .findings
        .iter()
        .map(|f| f.severity.as_str())
        .max_by_key(|s| match *s {
            "critical" => 4,
            "high" => 3,
            "medium" => 2,
            "low" => 1,
            _ => 0,
        })
        .unwrap_or("info");

    let activity = PentestActivity {
        id: new_id("act"),
        timestamp: chrono::Utc::now().to_rfc3339(),
        category: "enumeration".to_string(),
        kind: result.kind.clone(),
        title: format!("Enumeration — {} ({})", result.kind, result.target),
        target: result.target.clone(),
        status: if result.success { "success" } else { "info" }.to_string(),
        severity: severity.to_string(),
        summary: if result.findings.is_empty() {
            format!("{} completed", result.kind)
        } else {
            format!("{} findings from {}", result.findings.len(), result.kind)
        },
        details: json!({
            "sourceId": format!("enum-{}-{}", result.kind, chrono::Utc::now().timestamp_millis()),
            "findings": result.findings,
            "rawOutput": result.raw_output,
            "durationMs": result.duration_ms,
        }),
        tags: vec!["enumeration".to_string(), result.kind.clone()],
        engagement_id: None,
    };
    log_activity(activity).await
}
