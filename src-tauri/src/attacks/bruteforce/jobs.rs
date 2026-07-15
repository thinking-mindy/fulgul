use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BruteJobProgress {
    pub tried: u32,
    pub total: u32,
    pub current: String,
    pub percent: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BruteJobResult {
    pub success: bool,
    pub credential: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BruteJob {
    pub job_id: String,
    pub kind: String,
    pub target: String,
    pub status: String,
    pub progress: BruteJobProgress,
    pub logs: Vec<String>,
    pub result: Option<BruteJobResult>,
    pub started_at: String,
    pub finished_at: Option<String>,
}

pub struct JobRuntime {
    pub job: BruteJob,
    pub stop: Arc<AtomicBool>,
}

lazy_static::lazy_static! {
    pub static ref BRUTE_JOBS: Arc<Mutex<HashMap<String, JobRuntime>>> =
        Arc::new(Mutex::new(HashMap::new()));
}

pub async fn register_job(kind: &str, target: &str, total: u32) -> (String, Arc<AtomicBool>) {
    let job_id = format!("brute-{}", chrono::Utc::now().timestamp_millis());
    let stop = Arc::new(AtomicBool::new(false));
    let job = BruteJob {
        job_id: job_id.clone(),
        kind: kind.to_string(),
        target: target.to_string(),
        status: "running".to_string(),
        progress: BruteJobProgress {
            tried: 0,
            total,
            current: String::new(),
            percent: 0,
        },
        logs: vec![format!(
            "[{}] Job started — authorized targets only.",
            chrono::Utc::now().format("%H:%M:%S")
        )],
        result: None,
        started_at: chrono::Utc::now().to_rfc3339(),
        finished_at: None,
    };
    BRUTE_JOBS
        .lock()
        .await
        .insert(job_id.clone(), JobRuntime { job, stop: stop.clone() });
    (job_id, stop)
}

pub async fn log_job(job_id: &str, msg: &str) {
    if let Some(rt) = BRUTE_JOBS.lock().await.get_mut(job_id) {
        rt.job.logs.push(format!(
            "[{}] {}",
            chrono::Utc::now().format("%H:%M:%S"),
            msg
        ));
        if rt.job.logs.len() > 500 {
            let drain = rt.job.logs.len() - 400;
            rt.job.logs.drain(0..drain);
        }
    }
}

pub async fn update_progress(job_id: &str, tried: u32, total: u32, current: &str) {
    if let Some(rt) = BRUTE_JOBS.lock().await.get_mut(job_id) {
        rt.job.progress.tried = tried;
        rt.job.progress.total = total;
        rt.job.progress.current = current.to_string();
        rt.job.progress.percent = if total > 0 {
            ((tried as f64 / total as f64) * 100.0).min(100.0) as u8
        } else {
            0
        };
    }
}

pub async fn finish_job(job_id: &str, status: &str, result: Option<BruteJobResult>) {
    let snapshot = {
        if let Some(rt) = BRUTE_JOBS.lock().await.get_mut(job_id) {
            rt.job.status = status.to_string();
            rt.job.result = result;
            rt.job.finished_at = Some(chrono::Utc::now().to_rfc3339());
            Some(rt.job.clone())
        } else {
            None
        }
    };
    if let Some(job) = snapshot {
        if matches!(job.status.as_str(), "completed" | "stopped" | "success" | "failed") {
            let _ = crate::storage::activity_log::log_brute_job(&job).await;
        }
    }
}

pub async fn should_stop(stop: &Arc<AtomicBool>, job_id: &str) -> bool {
    if stop.load(Ordering::Relaxed) {
        return true;
    }
    BRUTE_JOBS
        .lock()
        .await
        .get(job_id)
        .map(|rt| rt.stop.load(Ordering::Relaxed))
        .unwrap_or(true)
}

pub async fn stop_job(job_id: &str) -> Result<(), String> {
    let mut jobs = BRUTE_JOBS.lock().await;
    let rt = jobs
        .get_mut(job_id)
        .ok_or_else(|| "Job not found".to_string())?;
    rt.stop.store(true, Ordering::Relaxed);
    if rt.job.status == "running" {
        rt.job.status = "stopped".to_string();
        rt.job.finished_at = Some(chrono::Utc::now().to_rfc3339());
        rt.job.logs.push(format!(
            "[{}] Stopped by user.",
            chrono::Utc::now().format("%H:%M:%S")
        ));
    }
    Ok(())
}

pub async fn get_job(job_id: &str) -> Result<BruteJob, String> {
    BRUTE_JOBS
        .lock()
        .await
        .get(job_id)
        .map(|rt| rt.job.clone())
        .ok_or_else(|| "Job not found".to_string())
}

pub async fn list_jobs() -> Vec<BruteJob> {
    let jobs = BRUTE_JOBS.lock().await;
    let mut list: Vec<BruteJob> = jobs.values().map(|rt| rt.job.clone()).collect();
    list.sort_by(|a, b| b.started_at.cmp(&a.started_at));
    list.truncate(20);
    list
}
