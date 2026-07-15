// Optional mock handlers for scripted lab responses (not used by the live attack command path).

use tokio::time::{sleep, Duration};

pub struct MockService {
    pub port: u16,
    pub service_type: String,
}

impl MockService {
    pub fn new(port: u16, service_type: String) -> Self {
        Self { port, service_type }
    }

    pub async fn start(&self) -> Result<(), String> {
        // Simulate service startup
        sleep(Duration::from_millis(500)).await;
        Ok(())
    }

    pub async fn stop(&self) -> Result<(), String> {
        // Simulate service shutdown
        sleep(Duration::from_millis(200)).await;
        Ok(())
    }

    pub async fn handle_request(&self, request: &str) -> Result<String, String> {
        match self.service_type.as_str() {
            "web" => self.handle_web_request(request).await,
            "ssh" => self.handle_ssh_request(request).await,
            "smb" => self.handle_smb_request(request).await,
            "api" => self.handle_api_request(request).await,
            _ => Err("Unknown service type".to_string()),
        }
    }

    async fn handle_web_request(&self, request: &str) -> Result<String, String> {
        if request.contains("login") && request.contains("OR '1'='1") {
            Ok("HTTP/1.1 200 OK\nSet-Cookie: session=admin123\n\nLogin successful! Flag: FLAG{SQL_INJECTION_MASTER_2024}".to_string())
        } else if request.contains("<script>") {
            Ok("HTTP/1.1 200 OK\n\nXSS executed! Flag: FLAG{XSS_COOKIE_STEALER}".to_string())
        } else {
            Ok("HTTP/1.1 200 OK\nContent-Type: text/html\n\n<html><body>Welcome to Vulnerable Web App</body></html>".to_string())
        }
    }

    async fn handle_ssh_request(&self, request: &str) -> Result<String, String> {
        if request.contains("admin") && request.contains("password123") {
            Ok("SSH authentication successful\nFlag: FLAG{SSH_BRUTE_FORCE_SUCCESS}".to_string())
        } else {
            Ok("SSH-2.0-OpenSSH_7.4\nAuthentication failed".to_string())
        }
    }

    async fn handle_smb_request(&self, request: &str) -> Result<String, String> {
        if request.contains("guest") || request.contains("-N") {
            Ok("SMB share accessible\nFiles: flag.txt, confidential.doc\nFlag: FLAG{SMB_GUEST_ACCESS}".to_string())
        } else {
            Ok("SMB 2.1 service ready".to_string())
        }
    }

    async fn handle_api_request(&self, request: &str) -> Result<String, String> {
        if request.contains("Authorization: Bearer admin") {
            Ok("HTTP/1.1 200 OK\n{\"admin\": true, \"flag\": \"FLAG{API_AUTH_BYPASS}\"}".to_string())
        } else if request.contains("/users/1") {
            Ok("HTTP/1.1 200 OK\n{\"id\": 1, \"flag\": \"FLAG{IDOR_VULNERABILITY}\"}".to_string())
        } else {
            Ok("HTTP/1.1 200 OK\n{\"message\": \"API endpoint\"}".to_string())
        }
    }
}

