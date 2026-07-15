use crate::hardening::tasks::HardeningTask;

pub struct HardeningResult {
    pub success: bool,
    pub message: String,
    pub output: Option<String>,
}

pub async fn apply_hardening_task(task: &HardeningTask) -> HardeningResult {
    if let Some(ref command) = task.command {
        // Execute the command
        let os = crate::hardening::detector::detect_os();
        
        match os.as_str() {
            "linux" => execute_linux_command(command).await,
            "windows" => execute_windows_command(command).await,
            "macos" => execute_macos_command(command).await,
            _ => HardeningResult {
                success: false,
                message: "Unsupported operating system".to_string(),
                output: None,
            },
        }
    } else {
        HardeningResult {
            success: false,
            message: "No command available. Please apply manually using the suggestions.".to_string(),
            output: None,
        }
    }
}

async fn execute_linux_command(command: &str) -> HardeningResult {
    // Commands should be executed via the terminal executor for interactive support
    // This is a placeholder - actual execution happens via start_command_execution
    HardeningResult {
        success: true,
        message: format!("Command ready to execute: {}", command),
        output: Some(command.to_string()),
    }
}

async fn execute_windows_command(command: &str) -> HardeningResult {
    // Commands should be executed via the terminal executor for interactive support
    HardeningResult {
        success: true,
        message: format!("Command ready to execute: {}", command),
        output: Some(command.to_string()),
    }
}

async fn execute_macos_command(command: &str) -> HardeningResult {
    // Commands should be executed via the terminal executor for interactive support
    HardeningResult {
        success: true,
        message: format!("Command ready to execute: {}", command),
        output: Some(command.to_string()),
    }
}

pub fn validate_task_before_apply(task: &HardeningTask) -> Result<(), String> {
    // Check if task is applicable to current OS
    let os = crate::hardening::detector::detect_os();
    
    if !task.platform.contains(&os) && !task.platform.contains(&"all".to_string()) {
        return Err(format!("Task '{}' is not applicable to {}", task.name, os));
    }
    
    // Check if task requires reboot and warn user
    if task.requires_reboot {
        // This would be handled in the UI
    }
    
    Ok(())
}

