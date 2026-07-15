use std::process::Stdio;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

/// Run a shell command using the same shell as the built-in Security Shell
/// (`sh -c` on Unix, PowerShell on Windows). Collects stdout/stderr and waits
/// for completion with a timeout.
pub async fn run_command(command: &str, timeout_secs: u64) -> Result<String, String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("Empty command".to_string());
    }

    #[cfg(target_os = "windows")]
    let fut = Command::new("powershell")
        .arg("-Command")
        .arg(trimmed)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .output();

    #[cfg(not(target_os = "windows"))]
    let fut = {
        let mut cmd = Command::new("sh");
        cmd.arg("-c").arg(trimmed);
        cmd.stdin(Stdio::piped());
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());
        cmd.env("TERM", "xterm-256color");
        cmd.kill_on_drop(true);
        cmd.output()
    };

    match timeout(Duration::from_secs(timeout_secs), fut).await {
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
                combined = format!("(process exited with code {})", code);
            } else if !out.status.success() {
                combined.push_str(&format!("\n(exit code {})", code));
            }
            Ok(combined)
        }
        Ok(Err(e)) => Err(format!("Failed to run command: {}", e)),
        Err(_) => Err(format!("Command timed out after {} seconds", timeout_secs)),
    }
}
