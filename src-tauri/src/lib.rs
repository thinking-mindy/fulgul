mod commands;
mod scanner;
mod storage;
mod remediation;
mod attacks;
mod terminal;
mod hardening;

use commands::*;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let mut sources = Vec::new();
            if let Ok(resource_dir) = app.path().resource_dir() {
                sources.push(resource_dir.join("wordlists"));
            }
            tauri::async_runtime::block_on(
                attacks::bruteforce::wordlists::install_bundled_wordlists(&sources),
            )
            .map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            simulate_attack,
            get_hardening_tasks,
            scan_vulnerabilities,
            get_auto_response_settings,
            update_auto_response_settings,
            get_response_activities,
            scan_local_machine,
            scan_remote_ip,
            get_scan_history,
            compare_scans,
            search_security_data,
            export_security_report,
            delete_scan_result,
            get_all_vulnerabilities,
            get_vulnerabilities_by_scan,
            update_vulnerability_status,
            apply_fix,
            get_fix_suggestion,
            get_attack_scenarios,
            start_attack_session,
            get_attack_session,
            get_attack_sessions,
            execute_attack_command,
            run_attack_step,
            probe_scenario_target,
            complete_attack_step,
            stop_attack_session,
            scan_wifi_networks,
            list_wordlists,
            save_wordlist,
            delete_wordlist,
            preview_wordlist,
            enumerate_ssh_users,
            enumerate_http_users,
            start_wifi_bruteforce,
            start_ssh_bruteforce,
            start_http_bruteforce,
            get_brute_job,
            list_brute_jobs,
            stop_brute_job,
            check_ssh_target,
            run_recon_dns,
            run_recon_ssl,
            run_recon_http_headers,
            run_recon_banner,
            run_recon_whois,
            list_pentest_activities,
            get_pentest_activity,
            delete_pentest_activity,
            add_pentest_note,
            list_pentest_reports,
            get_pentest_report,
            create_pentest_report,
            update_pentest_report,
            delete_pentest_report,
            export_pentest_report_markdown,
            export_pentest_report_html,
            sync_report_activities,
            export_pentest_report_pdf,
            list_engagements,
            get_engagement,
            create_engagement,
            update_engagement,
            delete_engagement,
            get_active_engagement,
            set_active_engagement,
            get_pentest_workspace,
            update_pentest_workspace,
            set_workspace_primary_target,
            get_pipeline_summary,
            get_defense_workspace,
            update_defense_workspace,
            set_defense_primary_asset,
            add_defense_asset,
            add_defense_network,
            get_defense_pipeline_summary,
            list_loot,
            add_manual_loot,
            delete_loot_item,
            update_loot_item,
            run_enum_port_sweep,
            run_enum_subdomains,
            run_enum_web_paths,
            run_enum_service_banner,
            execute_command_interactive,
            start_command_execution,
            get_command_output,
            apply_hardening_task,
            get_hardening_task_details,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
