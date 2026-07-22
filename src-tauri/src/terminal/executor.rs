use crate::command::shell_async;
use serde::{Deserialize, Serialize};
use std::process::Stdio;
use tokio::io::{AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, ChildStdout, ChildStderr};
use tokio::sync::mpsc;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TerminalOutput {
    pub content: String,
    pub is_error: bool,
    pub is_password_prompt: bool,
}

pub struct TerminalExecutor {
    child: Option<Child>,
    stdin: Option<ChildStdin>,
    stdout: Option<BufReader<ChildStdout>>,
    stderr: Option<BufReader<ChildStderr>>,
}

impl TerminalExecutor {
    pub fn new() -> Self {
        Self {
            child: None,
            stdin: None,
            stdout: None,
            stderr: None,
        }
    }

    pub async fn start_command(
        &mut self,
        command: String,
        output_tx: mpsc::UnboundedSender<TerminalOutput>,
    ) -> Result<(), String> {
        use tokio::io::AsyncBufReadExt;

        let mut cmd = shell_async(&command);
        cmd.stdin(Stdio::piped());
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());
        cmd.kill_on_drop(true);

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn command: {e}"))?;

        let stdin = child.stdin.take().ok_or("Failed to get stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to get stdout")?;
        let stderr = child.stderr.take().ok_or("Failed to get stderr")?;

        self.stdin = Some(stdin);
        self.stdout = Some(BufReader::new(stdout));
        self.stderr = Some(BufReader::new(stderr));
        self.child = Some(child);

        let stdout_reader = self.stdout.take().unwrap();
        let stderr_reader = self.stderr.take().unwrap();
        let output_tx_stdout = output_tx.clone();
        let output_tx_stderr = output_tx;

        tokio::spawn(async move {
            let mut reader = stdout_reader;
            let mut line = String::new();
            loop {
                line.clear();
                match reader.read_line(&mut line).await {
                    Ok(0) => break,
                    Ok(_) => {
                        let is_password = line.contains("password")
                            || line.contains("Password")
                            || line.contains("[sudo]");
                        let _ = output_tx_stdout.send(TerminalOutput {
                            content: line.clone(),
                            is_error: false,
                            is_password_prompt: is_password,
                        });
                    }
                    Err(_) => break,
                }
            }
        });

        tokio::spawn(async move {
            let mut reader = stderr_reader;
            let mut line = String::new();
            loop {
                line.clear();
                match reader.read_line(&mut line).await {
                    Ok(0) => break,
                    Ok(_) => {
                        let is_password = line.contains("password")
                            || line.contains("Password")
                            || line.contains("[sudo]");
                        let _ = output_tx_stderr.send(TerminalOutput {
                            content: line.clone(),
                            is_error: true,
                            is_password_prompt: is_password,
                        });
                    }
                    Err(_) => break,
                }
            }
        });

        Ok(())
    }

    pub async fn write_input(&mut self, input: String) -> Result<(), String> {
        if let Some(ref mut stdin) = self.stdin {
            stdin
                .write_all(input.as_bytes())
                .await
                .map_err(|e| format!("Failed to write to stdin: {e}"))?;
            stdin
                .write_all(b"\n")
                .await
                .map_err(|e| format!("Failed to write newline: {e}"))?;
            stdin
                .flush()
                .await
                .map_err(|e| format!("Failed to flush stdin: {e}"))?;
            Ok(())
        } else {
            Err("No active command".to_string())
        }
    }

    pub async fn wait_for_completion(&mut self) -> Result<i32, String> {
        if let Some(ref mut child) = self.child {
            let status = child
                .wait()
                .await
                .map_err(|e| format!("Failed to wait for process: {e}"))?;
            Ok(status.code().unwrap_or(-1))
        } else {
            Err("No active command".to_string())
        }
    }

    pub fn is_running(&self) -> bool {
        self.child.is_some()
    }
}
