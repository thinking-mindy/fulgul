//! Silent subprocess execution — stdout/stderr captured in Rust, no console windows.

use std::process::{Command as SyncCommand, Output, Stdio};
use tokio::process::Command as AsyncCommand;
use tokio::time::{timeout, Duration};

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[cfg(windows)]
fn hide_sync(cmd: &mut SyncCommand) {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_sync(_cmd: &mut SyncCommand) {}

#[cfg(windows)]
fn hide_async(cmd: &mut AsyncCommand) {
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(windows))]
fn hide_async(_cmd: &mut AsyncCommand) {}

fn pipe_stdio_sync(cmd: &mut SyncCommand) {
    cmd.stdin(Stdio::null());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    hide_sync(cmd);
}

fn pipe_stdio_async(cmd: &mut AsyncCommand) {
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    hide_async(cmd);
}

/// Spawn a program silently (sync). Use for short scanner/detector probes.
pub fn program(name: &str) -> SyncCommand {
    let mut cmd = SyncCommand::new(name);
    pipe_stdio_sync(&mut cmd);
    cmd
}

/// Run PowerShell silently (Windows only — falls back to shell on other OS).
pub fn powershell_sync(script: &str) -> SyncCommand {
    #[cfg(target_os = "windows")]
    {
        let mut cmd = program("powershell");
        cmd.args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            script,
        ]);
        cmd
    }
    #[cfg(not(target_os = "windows"))]
    {
        shell_sync(script)
    }
}

/// Run a shell one-liner silently (sync).
pub fn shell_sync(command: &str) -> SyncCommand {
    let trimmed = command.trim();
    #[cfg(target_os = "windows")]
    let mut cmd = SyncCommand::new("cmd");
    #[cfg(target_os = "windows")]
    cmd.args(["/C", trimmed]);

    #[cfg(not(target_os = "windows"))]
    let mut cmd = {
        let mut c = SyncCommand::new("sh");
        c.arg("-c").arg(trimmed);
        c
    };

    pipe_stdio_sync(&mut cmd);
    cmd
}

/// Run a shell command silently (sync) and return combined output.
pub fn run_shell_sync(command: &str) -> Result<String, String> {
    let output = shell_sync(command)
        .output()
        .map_err(|e| format!("Failed to run command: {e}"))?;
    Ok(format_output(&output))
}

/// Build an async shell command with piped I/O and no visible window.
pub fn shell_async(command: &str) -> AsyncCommand {
    let trimmed = command.trim();

    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut c = AsyncCommand::new("cmd");
        c.arg("/C").arg(trimmed);
        c
    };

    #[cfg(not(target_os = "windows"))]
    let mut cmd = {
        let mut c = AsyncCommand::new("sh");
        c.arg("-c").arg(trimmed);
        c.env("TERM", "xterm-256color");
        c
    };

    pipe_stdio_async(&mut cmd);
    cmd.kill_on_drop(true);
    cmd
}

fn format_output(out: &Output) -> String {
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
    combined
}

/// Run a shell command silently (async) with timeout; returns captured output.
pub async fn run_shell(command: &str, timeout_secs: u64) -> Result<String, String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("Empty command".to_string());
    }

    let mut cmd = shell_async(trimmed);
    match timeout(Duration::from_secs(timeout_secs), cmd.output()).await {
        Ok(Ok(out)) => Ok(format_output(&out)),
        Ok(Err(e)) => Err(format!("Failed to run command: {e}")),
        Err(_) => Err(format!("Command timed out after {timeout_secs} seconds")),
    }
}
