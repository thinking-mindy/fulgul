use super::runner::shell_command;
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Child;
use tokio::sync::Mutex;

#[derive(Debug, Clone)]
pub struct TerminalSession {
    pub id: String,
    pub command: String,
    pub output: Vec<String>,
    pub status: String,
    pub exit_code: Option<i32>,
}

lazy_static::lazy_static! {
    static ref SESSIONS: Arc<Mutex<HashMap<String, TerminalSession>>> =
        Arc::new(Mutex::new(HashMap::new()));
}

fn new_session_id() -> String {
    use rand::Rng;
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    std::time::SystemTime::now().hash(&mut hasher);
    rand::thread_rng().gen::<u64>().hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

pub async fn start_session(command: String, final_command: String) -> Result<String, String> {
    let session_id = new_session_id();

    let mut cmd = shell_command(&final_command);
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    cmd.kill_on_drop(true);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn command: {e}"))?;

    let stdout = child.stdout.take().ok_or("Failed to get stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to get stderr")?;

    SESSIONS.lock().await.insert(
        session_id.clone(),
        TerminalSession {
            id: session_id.clone(),
            command: command.clone(),
            output: Vec::new(),
            status: "running".to_string(),
            exit_code: None,
        },
    );

    spawn_output_reader(stdout, session_id.clone(), false);
    spawn_output_reader(stderr, session_id.clone(), true);
    spawn_completion_waiter(child, session_id.clone());

    Ok(session_id)
}

fn spawn_output_reader<R>(reader: R, session_id: String, is_stderr: bool)
where
    R: tokio::io::AsyncRead + Unpin + Send + 'static,
{
    tokio::spawn(async move {
        let mut reader = BufReader::new(reader);
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line).await {
                Ok(0) => break,
                Ok(_) => {
                    let output_line = line.trim_end().to_string();
                    if output_line.is_empty() {
                        continue;
                    }
                    let stored = if is_stderr {
                        format!("[stderr] {output_line}")
                    } else {
                        output_line
                    };
                    if let Some(session) = SESSIONS.lock().await.get_mut(&session_id) {
                        session.output.push(stored);
                    }
                }
                Err(_) => break,
            }
        }
    });
}

fn spawn_completion_waiter(mut child: Child, session_id: String) {
    tokio::spawn(async move {
        let result = child.wait().await;
        if let Some(session) = SESSIONS.lock().await.get_mut(&session_id) {
            match result {
                Ok(status) => {
                    let exit_code = status.code().unwrap_or(-1);
                    session.status = if exit_code == 0 {
                        "completed".to_string()
                    } else {
                        "failed".to_string()
                    };
                    session.exit_code = Some(exit_code);
                }
                Err(_) => {
                    session.status = "failed".to_string();
                    session.exit_code = Some(-1);
                }
            }
        }
    });
}

pub async fn get_session(session_id: &str) -> Option<TerminalSession> {
    SESSIONS.lock().await.get(session_id).cloned()
}
