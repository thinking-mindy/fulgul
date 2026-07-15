use crate::commands::ScanResult;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DefenseAsset {
    pub id: String,
    pub hostname: String,
    pub ip: Option<String>,
    pub criticality: String,
    pub owner: String,
    pub last_score: Option<u32>,
    pub open_ports: Vec<u16>,
    pub vuln_count: u32,
    pub source: String,
    pub notes: String,
    pub added_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DefenseWorkspace {
    pub engagement_id: Option<String>,
    pub primary_asset: String,
    pub assets: Vec<DefenseAsset>,
    pub protected_networks: Vec<String>,
    pub phase_status: HashMap<String, String>,
    pub compliance_notes: String,
    pub updated_at: String,
}

impl Default for DefenseWorkspace {
    fn default() -> Self {
        let mut phase_status = HashMap::new();
        for phase in [
            "scope",
            "discovery",
            "assessment",
            "analysis",
            "hardening",
            "response",
            "reporting",
        ] {
            phase_status.insert(phase.to_string(), "idle".to_string());
        }
        Self {
            engagement_id: None,
            primary_asset: String::new(),
            assets: Vec::new(),
            protected_networks: Vec::new(),
            phase_status,
            compliance_notes: String::new(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

async fn workspace_path() -> Result<PathBuf, String> {
    Ok(crate::storage::json_storage::get_storage_dir()
        .await?
        .join("defense_workspace.json"))
}

pub async fn load_workspace() -> Result<DefenseWorkspace, String> {
    let path = workspace_path().await?;
    if !path.exists() {
        return Ok(DefenseWorkspace::default());
    }
    let content = fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read defense workspace: {e}"))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse defense workspace: {e}"))
}

pub async fn save_workspace(workspace: &DefenseWorkspace) -> Result<(), String> {
    let path = workspace_path().await?;
    let content = serde_json::to_string_pretty(workspace)
        .map_err(|e| format!("Failed to serialize defense workspace: {e}"))?;
    fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write defense workspace: {e}"))
}

pub async fn get_workspace() -> Result<DefenseWorkspace, String> {
    let mut ws = load_workspace().await?;
    if ws.engagement_id.is_none() {
        ws.engagement_id = crate::storage::engagements::active_engagement_id().await;
    }
    Ok(ws)
}

pub async fn update_workspace(mut workspace: DefenseWorkspace) -> Result<DefenseWorkspace, String> {
    workspace.updated_at = chrono::Utc::now().to_rfc3339();
    save_workspace(&workspace).await?;
    Ok(workspace)
}

pub async fn set_primary_asset(asset: String) -> Result<DefenseWorkspace, String> {
    let mut ws = get_workspace().await?;
    ws.primary_asset = asset.trim().to_string();
    update_workspace(ws).await
}

pub async fn set_phase_status(phase: &str, status: &str) -> Result<DefenseWorkspace, String> {
    let mut ws = get_workspace().await?;
    ws.phase_status.insert(phase.to_string(), status.to_string());
    update_workspace(ws).await
}

pub async fn add_protected_network(cidr: &str) -> Result<DefenseWorkspace, String> {
    let c = cidr.trim().to_string();
    if c.is_empty() {
        return get_workspace().await;
    }
    let mut ws = get_workspace().await?;
    if !ws.protected_networks.contains(&c) {
        ws.protected_networks.push(c);
    }
    update_workspace(ws).await
}

pub async fn add_or_update_asset(
    hostname: &str,
    ip: Option<String>,
    criticality: &str,
    owner: &str,
    source: &str,
    notes: &str,
    last_score: Option<u32>,
    open_ports: Vec<u16>,
    vuln_count: u32,
) -> Result<DefenseWorkspace, String> {
    let hostname = hostname.trim().to_string();
    if hostname.is_empty() {
        return get_workspace().await;
    }

    let now = chrono::Utc::now().to_rfc3339();
    let mut ws = get_workspace().await?;

    if let Some(existing) = ws.assets.iter_mut().find(|a| {
        a.hostname == hostname || ip.as_ref().is_some_and(|i| a.ip.as_deref() == Some(i.as_str()))
    }) {
        existing.last_score = last_score.or(existing.last_score);
        existing.open_ports = open_ports;
        existing.vuln_count = vuln_count;
        existing.notes = if notes.is_empty() {
            existing.notes.clone()
        } else {
            notes.to_string()
        };
        existing.updated_at = now;
        if !criticality.is_empty() {
            existing.criticality = criticality.to_string();
        }
    } else {
        ws.assets.push(DefenseAsset {
            id: format!("asset-{}", chrono::Utc::now().timestamp_millis()),
            hostname: hostname.clone(),
            ip,
            criticality: if criticality.is_empty() {
                "medium".to_string()
            } else {
                criticality.to_string()
            },
            owner: owner.to_string(),
            last_score,
            open_ports,
            vuln_count,
            source: source.to_string(),
            notes: notes.to_string(),
            added_at: now.clone(),
            updated_at: now,
        });
    }

    if ws.primary_asset.is_empty() {
        ws.primary_asset = hostname;
    }
    update_workspace(ws).await
}

pub async fn ingest_scan(scan: &ScanResult, remote: bool) -> Result<(), String> {
    let _ = set_phase_status("discovery", "active").await;
    let host = if remote {
        scan.os.strip_prefix("Remote: ").unwrap_or(&scan.os).to_string()
    } else {
        "localhost".to_string()
    };
    let ip = if remote { Some(host.clone()) } else { None };
    let _ = add_or_update_asset(
        if remote { &host } else { "localhost" },
        ip,
        "high",
        "defense-ops",
        if remote { "remote_scan" } else { "local_scan" },
        &format!(
            "Score {}/100 — {} findings",
            scan.security_score,
            scan.vulnerabilities.len()
        ),
        Some(scan.security_score),
        scan.open_ports.clone(),
        scan.vulnerabilities.len() as u32,
    )
    .await;
    if !scan.vulnerabilities.is_empty() {
        let _ = set_phase_status("assessment", "active").await;
    }
    Ok(())
}

pub async fn add_manual_asset(
    hostname: String,
    ip: Option<String>,
    criticality: String,
    owner: String,
    notes: Option<String>,
) -> Result<DefenseAsset, String> {
    let _ = set_phase_status("scope", "active").await;
    let ws = add_or_update_asset(
        &hostname,
        ip,
        &criticality,
        &owner,
        "manual",
        &notes.unwrap_or_default(),
        None,
        vec![],
        0,
    )
    .await?;
    ws.assets
        .into_iter()
        .find(|a| a.hostname == hostname)
        .ok_or_else(|| "Failed to register asset".to_string())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DefensePipelineSummary {
    pub engagement_active: bool,
    pub engagement_name: Option<String>,
    pub primary_asset: String,
    pub assets_registered: u32,
    pub networks_protected: u32,
    pub scans_total: u32,
    pub vulnerabilities_total: u32,
    pub critical_vulns: u32,
    pub pending_hardening: u32,
    pub response_events: u32,
    pub reports_count: u32,
    pub average_score: u32,
    pub phase_counts: HashMap<String, u32>,
    pub phase_status: HashMap<String, String>,
}

pub async fn sync_engagement(engagement_id: Option<String>) -> Result<DefenseWorkspace, String> {
    let mut ws = get_workspace().await?;
    ws.engagement_id = engagement_id;
    if let Some(ref id) = ws.engagement_id {
        if let Ok(eng) = crate::storage::engagements::get_engagement(id).await {
            for t in &eng.scope_targets {
                let _ = add_protected_network(t).await;
            }
            if ws.primary_asset.is_empty() && !eng.scope_targets.is_empty() {
                ws.primary_asset = eng.scope_targets[0].clone();
            }
        }
    }
    update_workspace(ws).await
}

pub async fn get_pipeline_summary() -> Result<DefensePipelineSummary, String> {
    let ws = get_workspace().await?;
    let history = crate::storage::json_storage::load_scan_history().await.unwrap_or_default();
    let all_vulns = crate::storage::json_storage::get_all_vulnerabilities()
        .await
        .unwrap_or_default();
    let reports = crate::storage::reports::list_reports().await.unwrap_or_default();
    let response = crate::storage::json_storage::load_response_activities()
        .await
        .unwrap_or_default();

    let critical_vulns = all_vulns
        .iter()
        .filter(|(v, _)| {
            let s = v.severity.to_lowercase();
            s == "critical" || s == "high"
        })
        .count() as u32;

    let pending_hardening = all_vulns
        .iter()
        .filter(|(v, _)| v.status == "pending")
        .count() as u32;

    let scores: Vec<u32> = history.iter().map(|s| s.security_score).collect();
    let average_score = if scores.is_empty() {
        0
    } else {
        scores.iter().sum::<u32>() / scores.len() as u32
    };

    let mut phase_counts: HashMap<String, u32> = HashMap::new();
    for phase in [
        "scope",
        "discovery",
        "assessment",
        "analysis",
        "hardening",
        "response",
        "reporting",
    ] {
        phase_counts.insert(phase.to_string(), 0);
    }

    *phase_counts.entry("scope".to_string()).or_insert(0) += ws.assets.len() as u32;
    *phase_counts.entry("scope".to_string()).or_insert(0) += ws.protected_networks.len() as u32;
    *phase_counts.entry("discovery".to_string()).or_insert(0) += history.len() as u32;
    *phase_counts.entry("assessment".to_string()).or_insert(0) += all_vulns.len() as u32;
    *phase_counts.entry("analysis".to_string()).or_insert(0) += if history.len() > 1 {
        1
    } else {
        0
    };
    *phase_counts.entry("hardening".to_string()).or_insert(0) += pending_hardening;
    *phase_counts.entry("response".to_string()).or_insert(0) += response.len() as u32;
    *phase_counts.entry("reporting".to_string()).or_insert(0) += reports.len() as u32;

    let engagement_name = match &ws.engagement_id {
        Some(id) => crate::storage::engagements::get_engagement(id)
            .await
            .ok()
            .map(|e| e.name),
        None => None,
    };

    Ok(DefensePipelineSummary {
        engagement_active: ws.engagement_id.is_some(),
        engagement_name,
        primary_asset: ws.primary_asset.clone(),
        assets_registered: ws.assets.len() as u32,
        networks_protected: ws.protected_networks.len() as u32,
        scans_total: history.len() as u32,
        vulnerabilities_total: all_vulns.len() as u32,
        critical_vulns,
        pending_hardening,
        response_events: response.len() as u32,
        reports_count: reports.len() as u32,
        average_score,
        phase_counts,
        phase_status: ws.phase_status.clone(),
    })
}
