use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceTarget {
    pub id: String,
    pub host: String,
    pub ports: Vec<u16>,
    pub services: Vec<String>,
    pub source: String,
    pub notes: String,
    pub added_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PentestWorkspace {
    pub engagement_id: Option<String>,
    pub primary_target: String,
    pub targets: Vec<WorkspaceTarget>,
    pub urls: Vec<String>,
    pub domains: Vec<String>,
    pub phase_status: HashMap<String, String>,
    pub shared_notes: String,
    pub updated_at: String,
}

impl Default for PentestWorkspace {
    fn default() -> Self {
        let mut phase_status = HashMap::new();
        for phase in [
            "planning",
            "recon",
            "enumeration",
            "vulnerability",
            "exploitation",
            "post_exploit",
            "reporting",
        ] {
            phase_status.insert(phase.to_string(), "idle".to_string());
        }
        Self {
            engagement_id: None,
            primary_target: String::new(),
            targets: Vec::new(),
            urls: Vec::new(),
            domains: Vec::new(),
            phase_status,
            shared_notes: String::new(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        }
    }
}

async fn workspace_path() -> Result<PathBuf, String> {
    Ok(crate::storage::json_storage::get_storage_dir()
        .await?
        .join("pentest_workspace.json"))
}

pub async fn load_workspace() -> Result<PentestWorkspace, String> {
    let path = workspace_path().await?;
    if !path.exists() {
        return Ok(PentestWorkspace::default());
    }
    let content = fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read workspace: {e}"))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse workspace: {e}"))
}

pub async fn save_workspace(workspace: &PentestWorkspace) -> Result<(), String> {
    let path = workspace_path().await?;
    let content = serde_json::to_string_pretty(workspace)
        .map_err(|e| format!("Failed to serialize workspace: {e}"))?;
    fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write workspace: {e}"))
}

pub async fn get_workspace() -> Result<PentestWorkspace, String> {
    let mut ws = load_workspace().await?;
    if ws.engagement_id.is_none() {
        ws.engagement_id = crate::storage::engagements::active_engagement_id().await;
    }
    Ok(ws)
}

pub async fn update_workspace(mut workspace: PentestWorkspace) -> Result<PentestWorkspace, String> {
    workspace.updated_at = chrono::Utc::now().to_rfc3339();
    save_workspace(&workspace).await?;
    Ok(workspace)
}

pub async fn set_primary_target(target: String) -> Result<PentestWorkspace, String> {
    let mut ws = get_workspace().await?;
    ws.primary_target = target.trim().to_string();
    update_workspace(ws).await
}

pub async fn set_phase_status(phase: &str, status: &str) -> Result<PentestWorkspace, String> {
    let mut ws = get_workspace().await?;
    ws.phase_status.insert(phase.to_string(), status.to_string());
    update_workspace(ws).await
}

pub async fn add_domain(domain: &str) -> Result<PentestWorkspace, String> {
    let d = domain.trim().to_lowercase();
    if d.is_empty() {
        return get_workspace().await;
    }
    let mut ws = get_workspace().await?;
    if !ws.domains.iter().any(|x| x == &d) {
        ws.domains.push(d);
    }
    update_workspace(ws).await
}

pub async fn add_url(url: &str) -> Result<PentestWorkspace, String> {
    let u = url.trim().to_string();
    if u.is_empty() {
        return get_workspace().await;
    }
    let mut ws = get_workspace().await?;
    if !ws.urls.iter().any(|x| x == &u) {
        ws.urls.push(u);
    }
    update_workspace(ws).await
}

pub async fn add_or_update_target(
    host: &str,
    ports: Vec<u16>,
    services: Vec<String>,
    source: &str,
    notes: &str,
) -> Result<PentestWorkspace, String> {
    let host = host.trim().to_string();
    if host.is_empty() {
        return get_workspace().await;
    }

    let mut ws = get_workspace().await?;
    if let Some(existing) = ws.targets.iter_mut().find(|t| t.host == host) {
        for p in ports {
            if !existing.ports.contains(&p) {
                existing.ports.push(p);
            }
        }
        existing.ports.sort_unstable();
        for s in services {
            if !existing.services.contains(&s) {
                existing.services.push(s);
            }
        }
        if !notes.is_empty() {
            existing.notes = notes.to_string();
        }
    } else {
        let mut sorted_ports = ports;
        sorted_ports.sort_unstable();
        ws.targets.push(WorkspaceTarget {
            id: format!("tgt-{}", chrono::Utc::now().timestamp_millis()),
            host: host.clone(),
            ports: sorted_ports,
            services,
            source: source.to_string(),
            notes: notes.to_string(),
            added_at: chrono::Utc::now().to_rfc3339(),
        });
    }

    if ws.primary_target.is_empty() {
        ws.primary_target = host;
    }
    update_workspace(ws).await
}

pub async fn sync_engagement_to_workspace(engagement_id: Option<String>) -> Result<PentestWorkspace, String> {
    let mut ws = get_workspace().await?;
    ws.engagement_id = engagement_id;
    if let Some(ref id) = ws.engagement_id {
        if let Ok(eng) = crate::storage::engagements::get_engagement(id).await {
            for t in &eng.scope_targets {
                let _ = add_domain(t).await;
            }
            if ws.primary_target.is_empty() && !eng.scope_targets.is_empty() {
                ws.primary_target = eng.scope_targets[0].clone();
            }
        }
    }
    update_workspace(ws).await
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PipelineSummary {
    pub engagement_active: bool,
    pub engagement_name: Option<String>,
    pub primary_target: String,
    pub targets_discovered: u32,
    pub domains_count: u32,
    pub urls_count: u32,
    pub loot_count: u32,
    pub activities_total: u32,
    pub reports_count: u32,
    pub phase_counts: HashMap<String, u32>,
    pub phase_status: HashMap<String, String>,
}

pub async fn ingest_recon(result: &crate::attacks::recon::ReconResult) -> Result<(), String> {
    let _ = set_phase_status("recon", "active").await;
    match result.kind.as_str() {
        "dns" | "whois" => {
            add_domain(&result.target).await?;
        }
        "http_headers" | "web_path_enum" => {
            add_url(&result.target).await?;
        }
        "ssl" | "banner" => {
            let host = result.target.split(':').next().unwrap_or(&result.target).to_string();
            add_or_update_target(&host, vec![], vec![], &result.kind, "").await?;
        }
        _ => {}
    }
    Ok(())
}

pub async fn get_pipeline_summary() -> Result<PipelineSummary, String> {
    let ws = get_workspace().await?;
    let activities = crate::storage::activity_log::list_activities(None, Some(500)).await?;
    let loot = crate::storage::loot::list_loot(ws.engagement_id.clone(), None, Some(500)).await?;
    let reports = crate::storage::reports::list_reports().await?;

    let mut phase_counts: HashMap<String, u32> = HashMap::new();
    for phase in [
        "planning",
        "recon",
        "enumeration",
        "vulnerability",
        "exploitation",
        "post_exploit",
        "reporting",
    ] {
        phase_counts.insert(phase.to_string(), 0);
    }

    for act in &activities {
        let phase = match act.category.as_str() {
            "recon" => "recon",
            "credential" | "attack" => "exploitation",
            "scan" => "vulnerability",
            "notes" if act.kind.contains("engagement") => "planning",
            "notes" => "post_exploit",
            _ if act.kind.contains("enum") => "enumeration",
            _ => continue,
        };
        *phase_counts.entry(phase.to_string()).or_insert(0) += 1;
    }
    *phase_counts.entry("post_exploit".to_string()).or_insert(0) += loot.len() as u32;
    *phase_counts.entry("reporting".to_string()).or_insert(0) += reports.len() as u32;

    let engagement_name = match &ws.engagement_id {
        Some(id) => crate::storage::engagements::get_engagement(id)
            .await
            .ok()
            .map(|e| e.name),
        None => None,
    };

    Ok(PipelineSummary {
        engagement_active: ws.engagement_id.is_some(),
        engagement_name,
        primary_target: ws.primary_target.clone(),
        targets_discovered: ws.targets.len() as u32,
        domains_count: ws.domains.len() as u32,
        urls_count: ws.urls.len() as u32,
        loot_count: loot.len() as u32,
        activities_total: activities.len() as u32,
        reports_count: reports.len() as u32,
        phase_counts,
        phase_status: ws.phase_status.clone(),
    })
}
