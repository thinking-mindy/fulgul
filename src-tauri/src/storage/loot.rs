use crate::attacks::bruteforce::jobs::BruteJob;
use crate::attacks::simulator::AttackSession;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LootItem {
    pub id: String,
    pub engagement_id: Option<String>,
    pub kind: String,
    pub title: String,
    pub value: String,
    pub target: String,
    pub source: String,
    pub source_id: Option<String>,
    pub severity: String,
    pub tags: Vec<String>,
    pub captured_at: String,
    pub notes: String,
}

async fn loot_dir() -> Result<PathBuf, String> {
    let dir = crate::storage::json_storage::get_storage_dir()
        .await?
        .join("loot");
    fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("Failed to create loot directory: {e}"))?;
    Ok(dir)
}

async fn index_path() -> Result<PathBuf, String> {
    Ok(crate::storage::json_storage::get_storage_dir()
        .await?
        .join("loot_index.json"))
}

fn new_id() -> String {
    format!("loot-{}", chrono::Utc::now().timestamp_millis())
}

async fn load_index() -> Result<Vec<LootItem>, String> {
    let path = index_path().await?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read loot index: {e}"))?;
    if content.trim().is_empty() {
        return Ok(Vec::new());
    }
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse loot index: {e}"))
}

async fn save_index(items: &[LootItem]) -> Result<(), String> {
    let path = index_path().await?;
    let content = serde_json::to_string_pretty(items)
        .map_err(|e| format!("Failed to serialize loot index: {e}"))?;
    fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write loot index: {e}"))
}

async fn save_item_file(item: &LootItem) -> Result<(), String> {
    let dir = loot_dir().await?;
    let path = dir.join(format!("{}.json", item.id));
    let content = serde_json::to_string_pretty(item)
        .map_err(|e| format!("Failed to serialize loot item: {e}"))?;
    fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write loot item: {e}"))
}

async fn source_exists(source_id: &str) -> Result<bool, String> {
    let items = load_index().await?;
    Ok(items
        .iter()
        .any(|i| i.source_id.as_deref() == Some(source_id)))
}

pub async fn add_loot_item(item: LootItem) -> Result<LootItem, String> {
    if let Some(ref sid) = item.source_id {
        if source_exists(sid).await? {
            let items = load_index().await?;
            if let Some(existing) = items.iter().find(|i| i.source_id.as_deref() == Some(sid.as_str())) {
                return Ok(existing.clone());
            }
        }
    }

    save_item_file(&item).await?;
    let mut index = load_index().await?;
    index.insert(0, item.clone());
    if index.len() > 1000 {
        let removed: Vec<_> = index.drain(1000..).map(|i| i.id).collect();
        let dir = loot_dir().await?;
        for id in removed {
            let _ = fs::remove_file(dir.join(format!("{id}.json"))).await;
        }
    }
    save_index(&index).await?;
    Ok(item)
}

pub async fn list_loot(
    engagement_id: Option<String>,
    kind: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<LootItem>, String> {
    let mut items = load_index().await?;
    if let Some(eid) = engagement_id.filter(|e| !e.is_empty()) {
        items.retain(|i| i.engagement_id.as_deref() == Some(eid.as_str()));
    }
    if let Some(k) = kind.filter(|k| !k.is_empty() && k != "all") {
        items.retain(|i| i.kind == k);
    }
    let cap = limit.unwrap_or(500);
    items.truncate(cap);
    Ok(items)
}

pub async fn get_loot_item(id: &str) -> Result<LootItem, String> {
    let dir = loot_dir().await?;
    let path = dir.join(format!("{id}.json"));
    if !path.exists() {
        return Err("Loot item not found".to_string());
    }
    let content = fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read loot item: {e}"))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse loot item: {e}"))
}

pub async fn update_loot_item(item: LootItem) -> Result<LootItem, String> {
    save_item_file(&item).await?;
    let mut index = load_index().await?;
    if let Some(slot) = index.iter_mut().find(|i| i.id == item.id) {
        *slot = item.clone();
    } else {
        index.insert(0, item.clone());
    }
    save_index(&index).await?;
    Ok(item)
}

pub async fn delete_loot_item(id: &str) -> Result<(), String> {
    let dir = loot_dir().await?;
    let path = dir.join(format!("{id}.json"));
    if path.exists() {
        fs::remove_file(&path)
            .await
            .map_err(|e| format!("Failed to delete loot item: {e}"))?;
    }
    let mut index = load_index().await?;
    index.retain(|i| i.id != id);
    save_index(&index).await
}

pub async fn capture_from_brute_job(job: &BruteJob) -> Result<(), String> {
    let result = match &job.result {
        Some(r) if r.success => r,
        _ => return Ok(()),
    };

    let engagement_id = crate::storage::engagements::active_engagement_id().await;
    let value = result
        .credential
        .clone()
        .or_else(|| {
            Some(format!(
                "{}:{}",
                result.username.as_deref().unwrap_or("?"),
                result.password.as_deref().unwrap_or("?")
            ))
        })
        .unwrap_or_else(|| result.message.clone());

    let item = LootItem {
        id: new_id(),
        engagement_id,
        kind: "credential".to_string(),
        title: format!("{} credential — {}", job.kind.to_uppercase(), job.target),
        value,
        target: job.target.clone(),
        source: format!("{}_brute", job.kind),
        source_id: Some(job.job_id.clone()),
        severity: "critical".to_string(),
        tags: vec!["auto-capture".to_string(), job.kind.clone(), "credential".to_string()],
        captured_at: job.finished_at.clone().unwrap_or_else(|| job.started_at.clone()),
        notes: result.message.clone(),
    };
    let _ = add_loot_item(item).await?;
    Ok(())
}

pub async fn capture_from_attack_session(session: &AttackSession) -> Result<(), String> {
    if session.flags_captured.is_empty() {
        return Ok(());
    }

    let engagement_id = crate::storage::engagements::active_engagement_id().await;
    for flag in &session.flags_captured {
        let source_id = format!("{}-{}", session.session_id, flag);
        let item = LootItem {
            id: new_id(),
            engagement_id: engagement_id.clone(),
            kind: "flag".to_string(),
            title: format!("Flag — {}", session.scenario_id),
            value: flag.clone(),
            target: session.scenario_id.clone(),
            source: "attack_lab".to_string(),
            source_id: Some(source_id),
            severity: "high".to_string(),
            tags: vec![
                "auto-capture".to_string(),
                "flag".to_string(),
                session.scenario_id.clone(),
            ],
            captured_at: session
                .end_time
                .clone()
                .unwrap_or_else(|| session.start_time.clone()),
            notes: format!("Captured during attack lab session {}", session.session_id),
        };
        let _ = add_loot_item(item).await?;
    }
    Ok(())
}

pub async fn add_manual_loot(
    kind: String,
    title: String,
    value: String,
    target: String,
    notes: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<LootItem, String> {
    let engagement_id = crate::storage::engagements::active_engagement_id().await;
    let item = LootItem {
        id: new_id(),
        engagement_id,
        kind,
        title,
        value,
        target,
        source: "manual".to_string(),
        source_id: None,
        severity: "medium".to_string(),
        tags: tags.unwrap_or_else(|| vec!["manual".to_string()]),
        captured_at: chrono::Utc::now().to_rfc3339(),
        notes: notes.unwrap_or_default(),
    };
    add_loot_item(item).await
}
