use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tokio::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WordlistInfo {
    pub id: String,
    pub name: String,
    pub line_count: usize,
    pub size_bytes: u64,
    pub builtin: bool,
    pub created_at: String,
}

pub async fn wordlists_dir() -> Result<PathBuf, String> {
    let dir = crate::storage::json_storage::get_storage_dir()
        .await?
        .join("wordlists");
    fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("Failed to create wordlists dir: {e}"))?;
    Ok(dir)
}

fn bundled_wordlists_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("wordlists")
}

fn is_builtin_name(name: &str) -> bool {
    name.starts_with("common-")
        || name.starts_with("top-")
        || name.starts_with("wifi-")
        || name.starts_with("twd-part-")
}

async fn copy_bundled_wordlist(source: &Path, dest: &Path) -> Result<(), String> {
    if dest.exists() {
        let src_meta = fs::metadata(source)
            .await
            .map_err(|e| format!("Failed to stat bundled wordlist: {e}"))?;
        let dest_meta = fs::metadata(dest)
            .await
            .map_err(|e| format!("Failed to stat installed wordlist: {e}"))?;
        if dest_meta.len() >= src_meta.len() {
            return Ok(());
        }
    }
    fs::copy(source, dest)
        .await
        .map_err(|e| format!("Failed to install bundled wordlist: {e}"))?;
    Ok(())
}

async fn install_bundled_wordlists_from(source_dir: &Path) -> Result<(), String> {
    if !source_dir.is_dir() {
        return Ok(());
    }
    let dest_dir = wordlists_dir().await?;
    let mut entries = fs::read_dir(source_dir)
        .await
        .map_err(|e| format!("Failed to read bundled wordlists: {e}"))?;
    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Failed to read bundled wordlist entry: {e}"))?
    {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("txt") {
            continue;
        }
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown.txt");
        copy_bundled_wordlist(&path, &dest_dir.join(name)).await?;
    }
    Ok(())
}

pub async fn install_bundled_wordlists(extra_dirs: &[PathBuf]) -> Result<(), String> {
    for dir in extra_dirs {
        install_bundled_wordlists_from(dir).await?;
    }
    install_bundled_wordlists_from(&bundled_wordlists_dir()).await
}

pub async fn ensure_builtin_wordlists() -> Result<(), String> {
    install_bundled_wordlists(&[]).await?;
    let dir = wordlists_dir().await?;
    let builtins: &[(&str, &str)] = &[
        (
            "common-usernames.txt",
            "admin\nroot\nuser\ntest\nguest\nubuntu\npi\nwww-data\npostgres\nmysql\n",
        ),
        (
            "top-passwords.txt",
            "password\n123456\n12345678\nadmin\nroot\nletmein\nwelcome\nmonkey\npassword1\nqwerty\n",
        ),
        (
            "wifi-common.txt",
            "password\n12345678\n1234567890\nadmin123\nwireless\ninternet\nchangeme\ndefault\n",
        ),
    ];
    for (name, content) in builtins {
        let path = dir.join(name);
        if !path.exists() {
            fs::write(&path, content)
                .await
                .map_err(|e| format!("Failed to write builtin wordlist: {e}"))?;
        }
    }
    Ok(())
}

fn sanitize_name(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>()
        .chars()
        .take(64)
        .collect()
}

pub async fn save_wordlist(name: &str, content: &str) -> Result<WordlistInfo, String> {
    ensure_builtin_wordlists().await?;
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return Err("Wordlist is empty".to_string());
    }
    let lines: Vec<&str> = trimmed.lines().filter(|l| !l.trim().is_empty()).collect();
    if lines.is_empty() {
        return Err("Wordlist has no valid lines".to_string());
    }
    if lines.len() > 500_000 {
        return Err("Wordlist too large (max 500,000 lines)".to_string());
    }

    let safe = sanitize_name(name);
    if safe.is_empty() {
        return Err("Invalid wordlist name".to_string());
    }
    let filename = if safe.ends_with(".txt") {
        safe
    } else {
        format!("{safe}.txt")
    };
    let path = wordlists_dir().await?.join(&filename);
    let normalized = lines.join("\n") + "\n";
    fs::write(&path, &normalized)
        .await
        .map_err(|e| format!("Failed to save wordlist: {e}"))?;

    stat_wordlist(&path, &filename, false).await
}

pub async fn list_wordlists() -> Result<Vec<WordlistInfo>, String> {
    ensure_builtin_wordlists().await?;
    let dir = wordlists_dir().await?;
    let mut lists = Vec::new();
    let mut entries = fs::read_dir(&dir)
        .await
        .map_err(|e| format!("Failed to read wordlists: {e}"))?;
    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Failed to read entry: {e}"))?
    {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("txt") {
            continue;
        }
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown.txt")
            .to_string();
        let builtin = is_builtin_name(&name);
        if let Ok(info) = stat_wordlist(&path, &name, builtin).await {
            lists.push(info);
        }
    }
    lists.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(lists)
}

async fn stat_wordlist(path: &PathBuf, name: &str, builtin: bool) -> Result<WordlistInfo, String> {
    let content = fs::read_to_string(path)
        .await
        .map_err(|e| format!("Failed to read wordlist: {e}"))?;
    let line_count = content.lines().filter(|l| !l.trim().is_empty()).count();
    let meta = fs::metadata(path)
        .await
        .map_err(|e| format!("Failed to stat wordlist: {e}"))?;
    Ok(WordlistInfo {
        id: name.to_string(),
        name: name.to_string(),
        line_count,
        size_bytes: meta.len(),
        builtin,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

pub async fn load_wordlist_lines(id: &str) -> Result<Vec<String>, String> {
    let safe = sanitize_name(id);
    let path = wordlists_dir().await?.join(&safe);
    if !path.exists() {
        return Err(format!("Wordlist not found: {id}"));
    }
    let content = fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read wordlist: {e}"))?;
    Ok(content
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty())
        .map(str::to_string)
        .collect())
}

pub async fn delete_wordlist(id: &str) -> Result<(), String> {
    let safe = sanitize_name(id);
    if is_builtin_name(&safe) {
        return Err("Cannot delete built-in wordlists".to_string());
    }
    let path = wordlists_dir().await?.join(&safe);
    if path.exists() {
        fs::remove_file(&path)
            .await
            .map_err(|e| format!("Failed to delete wordlist: {e}"))?;
    }
    Ok(())
}

pub async fn preview_wordlist(id: &str, limit: usize) -> Result<Vec<String>, String> {
    let lines = load_wordlist_lines(id).await?;
    Ok(lines.into_iter().take(limit).collect())
}
