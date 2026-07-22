use std::process::Stdio;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

/// Build the platform shell command used by Security Shell and in-app tooling.
/// Unix: `sh -c` · Windows: `cmd /C` (not PowerShell).
pub fn shell_command(command: &str) -> Command {
    let trimmed = command.trim();

    #[cfg(target_os = "windows")]
    {
        let mut cmd = Command::new("cmd");
        cmd.arg("/C").arg(trimmed);
        cmd
    }

    #[cfg(not(target_os = "windows"))]
    {
        let mut cmd = Command::new("sh");
        cmd.arg("-c").arg(trimmed);
        cmd.env("TERM", "xterm-256color");
        cmd
    }
}

/// Run a shell command using the built-in Security Shell backend.
/// Collects stdout/stderr and waits for completion with a timeout.
pub async fn run_command(command: &str, timeout_secs: u64) -> Result<String, String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("Empty command".to_string());
    }

    let mut cmd = shell_command(trimmed);
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    cmd.kill_on_drop(true);

    match timeout(Duration::from_secs(timeout_secs), cmd.output()).await {
        Ok(Ok(out)) => {
            let code = out.status.code().unwrap_or(-1);
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);
            let mut combined = String::new();
            if !stdout.is_empty() {
                combined.push_str(stdout.trim_end());
            }
            if !stderr.is_empty() {
                if !combined.is_empty() {
                    combined.push('\n');
                }
                combined.push_str("[stderr]\n");
                combined.push_str(stderr.trim_end());
            }
            if combined.is_empty() {
                combined = format!("(process exited with code {code})");
            } else if !out.status.success() {
                combined.push_str(&format!("\n(exit code {code})"));
            }
            Ok(combined)
        }
        Ok(Err(e)) => Err(format!("Failed to run command: {e}")),
        Err(_) => Err(format!("Command timed out after {timeout_secs} seconds")),
    }
}
