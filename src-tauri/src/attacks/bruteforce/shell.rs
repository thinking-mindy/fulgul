use crate::terminal::runner;

/// Run a shell command with a hard timeout. Never blocks indefinitely.
pub async fn run_timed_shell(command: &str, timeout_secs: u64) -> Result<String, String> {
    runner::run_command(command, timeout_secs).await
}

pub async fn command_exists(bin: &str) -> bool {
    #[cfg(not(target_os = "windows"))]
    let cmd = format!("command -v {bin} >/dev/null 2>&1 && echo yes");
    #[cfg(target_os = "windows")]
    let cmd = format!("where {bin} >nul 2>&1 && echo yes");
    run_timed_shell(&cmd, 3)
        .await
        .map(|o| o.contains("yes"))
        .unwrap_or(false)
}
