pub use crate::command::{run_shell, shell_async as shell_command};

/// Run a shell command silently via the Rust command module (no OS window).
pub async fn run_command(command: &str, timeout_secs: u64) -> Result<String, String> {
    run_shell(command, timeout_secs).await
}
