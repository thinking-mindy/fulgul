use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AttackScenario {
    pub id: String,
    pub name: String,
    pub description: String,
    pub difficulty: String, // "Easy", "Medium", "Hard"
    pub category: String, // "Web", "Network", "System"
    pub port: u16,
    pub flags: Vec<ScenarioFlag>,
    pub vulnerabilities: Vec<String>,
    #[serde(rename = "estimatedTime")]
    pub estimated_time: u32, // minutes
    pub status: String, // "available", "running", "completed"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScenarioFlag {
    pub id: String,
    pub name: String,
    pub description: String,
    pub value: String, // The flag to capture
    pub captured: bool,
    #[serde(rename = "captureMethod")]
    pub capture_method: String, // "sql_injection", "ssh_bruteforce", "smb_exploit", etc.
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AttackStep {
    pub id: String,
    pub name: String,
    pub description: String,
    pub command: String,
    #[serde(rename = "expectedOutput")]
    pub expected_output: String,
    pub completed: bool,
    pub output: Option<String>,
}

/// TCP port the scenario lab is expected to listen on (localhost).
pub fn scenario_target_port(scenario_id: &str) -> Option<u16> {
    get_available_scenarios()
        .iter()
        .find(|s| s.id == scenario_id)
        .map(|s| s.port)
}

pub fn get_available_scenarios() -> Vec<AttackScenario> {
    vec![
        AttackScenario {
            id: "dvwa-webapp".to_string(),
            name: "Vulnerable Web Application".to_string(),
            description: "A DVWA-like web application with SQL injection, XSS, and file upload vulnerabilities. Target: http://localhost:8081".to_string(),
            difficulty: "Easy".to_string(),
            category: "Web".to_string(),
            port: 8081,
            flags: vec![
                ScenarioFlag {
                    id: "flag-1".to_string(),
                    name: "SQL Injection Flag".to_string(),
                    description: "Extract the admin password using SQL injection".to_string(),
                    value: "FLAG{SQL_INJECTION_MASTER_2024}".to_string(),
                    captured: false,
                    capture_method: "sql_injection".to_string(),
                },
                ScenarioFlag {
                    id: "flag-2".to_string(),
                    name: "XSS Flag".to_string(),
                    description: "Steal session cookie using XSS attack".to_string(),
                    value: "FLAG{XSS_COOKIE_STEALER}".to_string(),
                    captured: false,
                    capture_method: "xss".to_string(),
                },
                ScenarioFlag {
                    id: "flag-3".to_string(),
                    name: "File Upload Flag".to_string(),
                    description: "Upload a malicious file and execute it".to_string(),
                    value: "FLAG{FILE_UPLOAD_RCE}".to_string(),
                    captured: false,
                    capture_method: "file_upload".to_string(),
                },
            ],
            vulnerabilities: vec![
                "SQL Injection in login form".to_string(),
                "Reflected XSS in search parameter".to_string(),
                "Unrestricted file upload".to_string(),
                "Weak password policy".to_string(),
            ],
            estimated_time: 30,
            status: "available".to_string(),
        },
        AttackScenario {
            id: "weak-ssh".to_string(),
            name: "Weak SSH Credentials".to_string(),
            description: "SSH server with weak default credentials. Target: localhost:2222. Username hints: admin, root, user".to_string(),
            difficulty: "Easy".to_string(),
            category: "Network".to_string(),
            port: 2222,
            flags: vec![
                ScenarioFlag {
                    id: "flag-1".to_string(),
                    name: "SSH Access Flag".to_string(),
                    description: "Brute force SSH credentials and find the flag file".to_string(),
                    value: "FLAG{SSH_BRUTE_FORCE_SUCCESS}".to_string(),
                    captured: false,
                    capture_method: "ssh_bruteforce".to_string(),
                },
                ScenarioFlag {
                    id: "flag-2".to_string(),
                    name: "Privilege Escalation Flag".to_string(),
                    description: "Escalate privileges and read root flag".to_string(),
                    value: "FLAG{PRIV_ESC_ROOT}".to_string(),
                    captured: false,
                    capture_method: "privilege_escalation".to_string(),
                },
            ],
            vulnerabilities: vec![
                "Weak default credentials".to_string(),
                "SSH password authentication enabled".to_string(),
                "No rate limiting on login attempts".to_string(),
                "SUID binary for privilege escalation".to_string(),
            ],
            estimated_time: 20,
            status: "available".to_string(),
        },
        AttackScenario {
            id: "smb-guest".to_string(),
            name: "SMB Guest Share".to_string(),
            description: "SMB server with guest access and sensitive files. Target: localhost:4450".to_string(),
            difficulty: "Medium".to_string(),
            category: "Network".to_string(),
            port: 4450,
            flags: vec![
                ScenarioFlag {
                    id: "flag-1".to_string(),
                    name: "SMB Enumeration Flag".to_string(),
                    description: "Enumerate SMB shares and find the flag".to_string(),
                    value: "FLAG{SMB_GUEST_ACCESS}".to_string(),
                    captured: false,
                    capture_method: "smb_enumeration".to_string(),
                },
                ScenarioFlag {
                    id: "flag-2".to_string(),
                    name: "SMB Exploit Flag".to_string(),
                    description: "Exploit SMB vulnerability to gain shell access".to_string(),
                    value: "FLAG{SMB_RCE_EXPLOIT}".to_string(),
                    captured: false,
                    capture_method: "smb_exploit".to_string(),
                },
            ],
            vulnerabilities: vec![
                "Guest access enabled".to_string(),
                "Unrestricted file sharing".to_string(),
                "SMB version 1 enabled".to_string(),
                "Weak SMB configuration".to_string(),
            ],
            estimated_time: 25,
            status: "available".to_string(),
        },
        AttackScenario {
            id: "api-endpoints".to_string(),
            name: "Vulnerable REST API".to_string(),
            description: "REST API with authentication bypass and IDOR vulnerabilities. Target: http://localhost:3000".to_string(),
            difficulty: "Medium".to_string(),
            category: "Web".to_string(),
            port: 3000,
            flags: vec![
                ScenarioFlag {
                    id: "flag-1".to_string(),
                    name: "API Bypass Flag".to_string(),
                    description: "Bypass authentication and access admin endpoints".to_string(),
                    value: "FLAG{API_AUTH_BYPASS}".to_string(),
                    captured: false,
                    capture_method: "api_bypass".to_string(),
                },
                ScenarioFlag {
                    id: "flag-2".to_string(),
                    name: "IDOR Flag".to_string(),
                    description: "Exploit IDOR to access other users' data".to_string(),
                    value: "FLAG{IDOR_VULNERABILITY}".to_string(),
                    captured: false,
                    capture_method: "idor".to_string(),
                },
            ],
            vulnerabilities: vec![
                "Weak JWT token validation".to_string(),
                "IDOR in user endpoints".to_string(),
                "No rate limiting".to_string(),
                "Information disclosure in error messages".to_string(),
            ],
            estimated_time: 35,
            status: "available".to_string(),
        },
    ]
}

