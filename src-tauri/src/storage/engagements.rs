use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tokio::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Engagement {
    pub id: String,
    pub name: String,
    pub client: String,
    pub status: String,
    pub scope_targets: Vec<String>,
    pub out_of_scope: Vec<String>,
    pub authorized_by: String,
    pub authorization_ref: String,
    pub authorization_date: String,
    pub start_date: String,
    pub end_date: String,
    pub rules_of_engagement: String,
    pub emergency_contact: String,
    pub notes: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ActiveEngagement {
    pub engagement_id: Option<String>,
}

async fn engagements_dir() -> Result<PathBuf, String> {
    let dir = crate::storage::json_storage::get_storage_dir()
        .await?
        .join("engagements");
    fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("Failed to create engagements directory: {e}"))?;
    Ok(dir)
}

fn active_path() -> &'static str {
    "active_engagement.json"
}

fn new_id() -> String {
    format!("eng-{}", chrono::Utc::now().timestamp_millis())
}

pub async fn list_engagements() -> Result<Vec<Engagement>, String> {
    let dir = engagements_dir().await?;
    let mut list = Vec::new();
    let mut entries = fs::read_dir(&dir)
        .await
        .map_err(|e| format!("Failed to read engagements: {e}"))?;

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Failed to read entry: {e}"))?
    {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        if path.file_name().and_then(|n| n.to_str()) == Some(active_path()) {
            continue;
        }
        let content = fs::read_to_string(&path)
            .await
            .map_err(|e| format!("Failed to read engagement: {e}"))?;
        if let Ok(eng) = serde_json::from_str::<Engagement>(&content) {
            list.push(eng);
        }
    }

    list.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(list)
}

pub async fn get_engagement(id: &str) -> Result<Engagement, String> {
    let dir = engagements_dir().await?;
    let path = dir.join(format!("{id}.json"));
    if !path.exists() {
        return Err("Engagement not found".to_string());
    }
    let content = fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read engagement: {e}"))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse engagement: {e}"))
}

async fn save_engagement(engagement: &Engagement) -> Result<(), String> {
    let dir = engagements_dir().await?;
    let path = dir.join(format!("{}.json", engagement.id));
    let content = serde_json::to_string_pretty(engagement)
        .map_err(|e| format!("Failed to serialize engagement: {e}"))?;
    fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write engagement: {e}"))
}

pub async fn create_engagement(
    name: String,
    client: String,
    scope_targets: Vec<String>,
    authorized_by: String,
    authorization_ref: String,
) -> Result<Engagement, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let engagement = Engagement {
        id: new_id(),
        name,
        client,
        status: "active".to_string(),
        scope_targets,
        out_of_scope: Vec::new(),
        authorized_by,
        authorization_ref,
        authorization_date: chrono::Utc::now().format("%Y-%m-%d").to_string(),
        start_date: chrono::Utc::now().format("%Y-%m-%d").to_string(),
        end_date: String::new(),
        rules_of_engagement: String::from(
            "Testing limited to in-scope targets only. No denial-of-service. Stop on out-of-scope discovery.",
        ),
        emergency_contact: String::new(),
        notes: String::new(),
        created_at: now.clone(),
        updated_at: now,
    };
    save_engagement(&engagement).await?;
    Ok(engagement)
}

pub async fn update_engagement(engagement: Engagement) -> Result<Engagement, String> {
    let mut updated = engagement;
    updated.updated_at = chrono::Utc::now().to_rfc3339();
    save_engagement(&updated).await?;
    Ok(updated)
}

pub async fn delete_engagement(id: &str) -> Result<(), String> {
    let dir = engagements_dir().await?;
    let path = dir.join(format!("{id}.json"));
    if path.exists() {
        fs::remove_file(&path)
            .await
            .map_err(|e| format!("Failed to delete engagement: {e}"))?;
    }
    let active = get_active_engagement().await?;
    if active.engagement_id.as_deref() == Some(id) {
        set_active_engagement(None).await?;
    }
    Ok(())
}

pub async fn get_active_engagement() -> Result<ActiveEngagement, String> {
    let storage = crate::storage::json_storage::get_storage_dir().await?;
    let path = storage.join(active_path());
    if !path.exists() {
        return Ok(ActiveEngagement::default());
    }
    let content = fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read active engagement: {e}"))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse active engagement: {e}"))
}

pub async fn set_active_engagement(engagement_id: Option<String>) -> Result<ActiveEngagement, String> {
    if let Some(ref id) = engagement_id {
        let _ = get_engagement(id).await?;
    }
    let active = ActiveEngagement { engagement_id };
    let storage = crate::storage::json_storage::get_storage_dir().await?;
    let path = storage.join(active_path());
    let content = serde_json::to_string_pretty(&active)
        .map_err(|e| format!("Failed to serialize active engagement: {e}"))?;
    fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write active engagement: {e}"))?;
    Ok(active)
}

pub async fn active_engagement_id() -> Option<String> {
    get_active_engagement().await.ok()?.engagement_id
}
