use crate::storage::activity_log::{get_activity, list_activities, PentestActivity};
use crate::storage::engagements::{get_engagement, Engagement};
use crate::storage::loot::{get_loot_item, list_loot, LootItem};
use serde::{Deserialize, Serialize};
use std::io::BufWriter;
use std::path::PathBuf;
use tokio::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PentestReport {
    pub id: String,
    pub title: String,
    pub client: String,
    pub tester: String,
    pub scope: String,
    pub executive_summary: String,
    pub created_at: String,
    pub updated_at: String,
    pub activity_ids: Vec<String>,
    pub visible_ids: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub engagement_id: Option<String>,
    #[serde(default)]
    pub include_loot: bool,
    #[serde(default)]
    pub visible_loot_ids: Vec<String>,
}

async fn reports_dir() -> Result<PathBuf, String> {
    let dir = crate::storage::json_storage::get_storage_dir()
        .await?
        .join("reports");
    fs::create_dir_all(&dir)
        .await
        .map_err(|e| format!("Failed to create reports directory: {e}"))?;
    Ok(dir)
}

fn new_report_id() -> String {
    format!("rpt-{}", chrono::Utc::now().timestamp_millis())
}

async fn save_report_file(report: &PentestReport) -> Result<(), String> {
    let dir = reports_dir().await?;
    let path = dir.join(format!("{}.json", report.id));
    let content = serde_json::to_string_pretty(report)
        .map_err(|e| format!("Failed to serialize report: {e}"))?;
    fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write report: {e}"))
}

pub async fn list_reports() -> Result<Vec<PentestReport>, String> {
    let dir = reports_dir().await?;
    let mut reports = Vec::new();
    let mut entries = fs::read_dir(&dir)
        .await
        .map_err(|e| format!("Failed to read reports directory: {e}"))?;

    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e| format!("Failed to read report entry: {e}"))?
    {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let content = fs::read_to_string(&path)
            .await
            .map_err(|e| format!("Failed to read report: {e}"))?;
        if let Ok(report) = serde_json::from_str::<PentestReport>(&content) {
            reports.push(report);
        }
    }

    reports.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(reports)
}

pub async fn get_report(id: &str) -> Result<PentestReport, String> {
    let dir = reports_dir().await?;
    let path = dir.join(format!("{id}.json"));
    if !path.exists() {
        return Err("Report not found".to_string());
    }
    let content = fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read report: {e}"))?;
    serde_json::from_str(&content).map_err(|e| format!("Failed to parse report: {e}"))
}

pub async fn delete_report(id: &str) -> Result<(), String> {
    let dir = reports_dir().await?;
    let path = dir.join(format!("{id}.json"));
    if path.exists() {
        fs::remove_file(&path)
            .await
            .map_err(|e| format!("Failed to delete report: {e}"))?;
    }
    Ok(())
}

pub async fn create_report(
    title: String,
    client: String,
    tester: String,
    scope: String,
    executive_summary: String,
    activity_ids: Vec<String>,
    engagement_id: Option<String>,
) -> Result<PentestReport, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let report = PentestReport {
        id: new_report_id(),
        title,
        client,
        tester,
        scope,
        executive_summary,
        created_at: now.clone(),
        updated_at: now,
        visible_ids: activity_ids.clone(),
        activity_ids,
        engagement_id,
        include_loot: true,
        visible_loot_ids: Vec::new(),
    };
    save_report_file(&report).await?;
    Ok(report)
}

pub async fn update_report(report: PentestReport) -> Result<PentestReport, String> {
    let mut updated = report;
    updated.updated_at = chrono::Utc::now().to_rfc3339();
    save_report_file(&updated).await?;
    Ok(updated)
}

pub async fn report_activities(report: &PentestReport) -> Result<Vec<PentestActivity>, String> {
    let mut out = Vec::new();
    for id in &report.activity_ids {
        if let Ok(act) = get_activity(id).await {
            out.push(act);
        }
    }
    Ok(out)
}

fn severity_badge(severity: &str) -> &str {
    match severity {
        "critical" => "🔴 CRITICAL",
        "high" => "🟠 HIGH",
        "medium" => "🟡 MEDIUM",
        "low" => "🔵 LOW",
        _ => "⚪ INFO",
    }
}

fn render_activity_section(activity: &PentestActivity, visible: bool) -> String {
    if !visible {
        return String::new();
    }

    let mut section = format!(
        "\n## {} — {}\n\n",
        activity.title,
        severity_badge(&activity.severity)
    );
    section.push_str(&format!(
        "- **Category:** {} / {}\n",
        activity.category, activity.kind
    ));
    section.push_str(&format!("- **Target:** {}\n", activity.target));
    section.push_str(&format!("- **Status:** {}\n", activity.status));
    section.push_str(&format!("- **When:** {}\n", activity.timestamp));
    section.push_str(&format!("\n{}\n", activity.summary));

    if let Some(vulns) = activity.details.get("vulnerabilities").and_then(|v| v.as_array()) {
        if !vulns.is_empty() {
            section.push_str("\n### Findings\n\n");
            for v in vulns.iter().take(20) {
                let title = v.get("title").and_then(|t| t.as_str()).unwrap_or("Finding");
                let sev = v.get("severity").and_then(|s| s.as_str()).unwrap_or("info");
                section.push_str(&format!("- **{title}** ({sev})\n"));
            }
        }
    }

    if let Some(findings) = activity.details.get("findings").and_then(|v| v.as_array()) {
        if !findings.is_empty() {
            section.push_str("\n### Recon findings\n\n");
            for f in findings {
                let label = f.get("label").and_then(|l| l.as_str()).unwrap_or("—");
                let value = f.get("value").and_then(|v| v.as_str()).unwrap_or("—");
                section.push_str(&format!("- **{label}:** {value}\n"));
            }
        }
    }

    if let Some(content) = activity.details.get("content").and_then(|c| c.as_str()) {
        section.push_str(&format!("\n### Notes\n\n{content}\n"));
    }

    if let Some(result) = activity.details.get("result") {
        if let Some(msg) = result.get("message").and_then(|m| m.as_str()) {
            section.push_str(&format!("\n### Result\n\n{msg}\n"));
        }
    }

    section.push_str("\n---\n");
    section
}

fn render_engagement_section(engagement: &Engagement) -> String {
    let mut section = String::from("## Authorization & Scope\n\n");
    section.push_str(&format!("- **Engagement:** {}\n", engagement.name));
    section.push_str(&format!("- **Client:** {}\n", engagement.client));
    section.push_str(&format!("- **Status:** {}\n", engagement.status));
    section.push_str(&format!(
        "- **Authorized by:** {} (ref: {})\n",
        engagement.authorized_by, engagement.authorization_ref
    ));
    section.push_str(&format!(
        "- **Authorization date:** {}\n",
        engagement.authorization_date
    ));
    if !engagement.scope_targets.is_empty() {
        section.push_str(&format!(
            "- **In-scope:** {}\n",
            engagement.scope_targets.join(", ")
        ));
    }
    if !engagement.out_of_scope.is_empty() {
        section.push_str(&format!(
            "- **Out-of-scope:** {}\n",
            engagement.out_of_scope.join(", ")
        ));
    }
    if !engagement.rules_of_engagement.is_empty() {
        section.push_str(&format!(
            "\n### Rules of engagement\n\n{}\n",
            engagement.rules_of_engagement
        ));
    }
    section.push_str("\n");
    section
}

fn render_loot_section(loot: &[LootItem], visible_ids: &[String]) -> String {
    let mut section = String::from("## Post-exploitation loot\n\n");
    let mut shown = 0;
    for item in loot {
        if !visible_ids.is_empty() && !visible_ids.contains(&item.id) {
            continue;
        }
        shown += 1;
        section.push_str(&format!(
            "### {} [{}]\n\n- **Type:** {}\n- **Target:** {}\n- **Value:** `{}`\n",
            item.title, item.severity, item.kind, item.target, item.value
        ));
        if !item.notes.is_empty() {
            section.push_str(&format!("- **Notes:** {}\n", item.notes));
        }
        section.push('\n');
    }
    if shown == 0 {
        section.push_str("_No loot items included._\n\n");
    }
    section
}

pub async fn report_loot(report: &PentestReport) -> Result<Vec<LootItem>, String> {
    if !report.include_loot {
        return Ok(Vec::new());
    }
    if !report.visible_loot_ids.is_empty() {
        let mut out = Vec::new();
        for id in &report.visible_loot_ids {
            if let Ok(item) = get_loot_item(id).await {
                out.push(item);
            }
        }
        return Ok(out);
    }
    list_loot(report.engagement_id.clone(), None, Some(200)).await
}

pub async fn generate_markdown(report_id: &str) -> Result<String, String> {
    let report = get_report(report_id).await?;
    let activities = report_activities(&report).await?;
    let loot = report_loot(&report).await?;
    let engagement = match &report.engagement_id {
        Some(id) => get_engagement(id).await.ok(),
        None => None,
    };

    let mut md = format!(
        "# {}\n\n> **Client:** {}  \n> **Tester:** {}  \n> **Generated:** {}  \n> **Report ID:** {}\n\n",
        report.title,
        report.client,
        report.tester,
        chrono::Utc::now().format("%Y-%m-%d %H:%M UTC"),
        report.id
    );

    if let Some(ref eng) = engagement {
        md.push_str(&render_engagement_section(eng));
    }

    if !report.scope.is_empty() {
        md.push_str(&format!("## Scope\n\n{}\n\n", report.scope));
    }

    if !report.executive_summary.is_empty() {
        md.push_str(&format!("## Executive Summary\n\n{}\n\n", report.executive_summary));
    }

    md.push_str("## Activity Log\n\n");
    md.push_str(&format!(
        "_Showing {} of {} recorded activities_\n",
        report.visible_ids.len(),
        report.activity_ids.len()
    ));

    for activity in &activities {
        let visible = report.visible_ids.contains(&activity.id);
        md.push_str(&render_activity_section(activity, visible));
    }

    if report.include_loot {
        let all_loot_ids: Vec<String> = loot.iter().map(|l| l.id.clone()).collect();
        let visible_loot_ref: &[String] = if report.visible_loot_ids.is_empty() {
            &all_loot_ids
        } else {
            &report.visible_loot_ids
        };
        md.push_str(&render_loot_section(&loot, visible_loot_ref));
    }

    md.push_str("\n\n---\n*Generated by Fulgul Pentest Suite — authorized testing only.*\n");
    Ok(md)
}

pub async fn generate_html(report_id: &str) -> Result<String, String> {
    let md = generate_markdown(report_id).await?;
    let body: String = md
        .lines()
        .map(|line| {
            if line.starts_with("# ") {
                format!("<h1>{}</h1>", html_escape(&line[2..]))
            } else if line.starts_with("## ") {
                format!("<h2>{}</h2>", html_escape(&line[3..]))
            } else if line.starts_with("### ") {
                format!("<h3>{}</h3>", html_escape(&line[4..]))
            } else if line.starts_with("- **") {
                format!("<li>{}</li>", html_escape(line.trim_start_matches("- ")))
            } else if line.starts_with("> ") {
                format!("<blockquote>{}</blockquote>", html_escape(&line[2..]))
            } else if line == "---" {
                "<hr/>".to_string()
            } else if line.starts_with('_') && line.ends_with('_') {
                format!("<p><em>{}</em></p>", html_escape(line.trim_matches('_')))
            } else if line.is_empty() {
                String::new()
            } else {
                format!("<p>{}</p>", html_escape(line))
            }
        })
        .collect::<Vec<_>>()
        .join("\n");

    Ok(format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Fulgul Pentest Report</title>
<style>
  :root {{ --bg:#0b0f17; --card:#121826; --text:#e8edf7; --muted:#8b9cb8; --accent:#3b82f6; --border:#1e293b; }}
  body {{ font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 2rem; line-height: 1.6; }}
  .wrap {{ max-width: 900px; margin: 0 auto; background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 2.5rem; box-shadow: 0 20px 60px rgba(0,0,0,.4); }}
  h1 {{ color: var(--accent); border-bottom: 2px solid var(--accent); padding-bottom: .5rem; }}
  h2 {{ color: #93c5fd; margin-top: 2rem; }}
  h3 {{ color: var(--muted); }}
  blockquote {{ border-left: 4px solid var(--accent); margin: 1rem 0; padding: .5rem 1rem; background: rgba(59,130,246,.08); border-radius: 0 8px 8px 0; }}
  li {{ margin: .35rem 0; }}
  hr {{ border: none; border-top: 1px solid var(--border); margin: 2rem 0; }}
  em {{ color: var(--muted); }}
</style>
</head>
<body><div class="wrap">{body}</div></body>
</html>"#
    ))
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

pub async fn import_all_activities_to_report(report_id: &str) -> Result<PentestReport, String> {
    let activities = list_activities(None, Some(500)).await?;
    let ids: Vec<String> = activities.iter().map(|a| a.id.clone()).collect();
    let loot = list_loot(None, None, Some(500)).await?;
    let loot_ids: Vec<String> = loot.iter().map(|l| l.id.clone()).collect();
    let mut report = get_report(report_id).await?;
    report.activity_ids = ids.clone();
    report.visible_ids = ids;
    report.visible_loot_ids = loot_ids;
    report.include_loot = true;
    update_report(report).await
}

pub async fn generate_pdf(report_id: &str) -> Result<Vec<u8>, String> {
    use printpdf::*;

    let report = get_report(report_id).await?;
    let md = generate_markdown(report_id).await?;
    let engagement = match &report.engagement_id {
        Some(id) => get_engagement(id).await.ok(),
        None => None,
    };

    let (doc, page1, layer1) = PdfDocument::new(
        &report.title,
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );
    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| format!("PDF font error: {e}"))?;
    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| format!("PDF font error: {e}"))?;

    let mut current_page = page1;
    let mut current_layer = layer1;
    let mut y = 280.0_f32;
    let line_h = 5.0_f32;
    let margin = 15.0_f32;
    let page_bottom = 20.0_f32;

    let ensure_space = |doc: &PdfDocumentReference,
                            page: &mut PdfPageIndex,
                            layer: &mut PdfLayerIndex,
                            y: &mut f32,
                            needed: f32| {
        if *y - needed < page_bottom {
            let (new_page, new_layer) = doc.add_page(Mm(210.0), Mm(297.0), "Layer 1");
            *page = new_page;
            *layer = new_layer;
            *y = 280.0;
        }
    };

    let write_line =
        |doc: &PdfDocumentReference,
         page: &mut PdfPageIndex,
         layer: &mut PdfLayerIndex,
         y: &mut f32,
         text: &str,
         size: f32,
         bold: bool| {
            ensure_space(doc, page, layer, y, line_h + 2.0);
            let layer_ref = doc.get_page(*page).get_layer(*layer);
            let f = if bold { &font_bold } else { &font };
            let clipped: String = text.chars().take(110).collect();
            layer_ref.use_text(&clipped, size, Mm(margin), Mm(*y), f);
            *y -= line_h + (size - 10.0) * 0.3;
        };

    write_line(
        &doc,
        &mut current_page,
        &mut current_layer,
        &mut y,
        &report.title,
        16.0,
        true,
    );
    y -= 2.0;
    write_line(
        &doc,
        &mut current_page,
        &mut current_layer,
        &mut y,
        &format!("Client: {} | Tester: {}", report.client, report.tester),
        10.0,
        false,
    );
    write_line(
        &doc,
        &mut current_page,
        &mut current_layer,
        &mut y,
        &format!(
            "Generated: {}",
            chrono::Utc::now().format("%Y-%m-%d %H:%M UTC")
        ),
        9.0,
        false,
    );

    if let Some(ref eng) = engagement {
        y -= 3.0;
        write_line(
            &doc,
            &mut current_page,
            &mut current_layer,
            &mut y,
            "AUTHORIZATION",
            12.0,
            true,
        );
        write_line(
            &doc,
            &mut current_page,
            &mut current_layer,
            &mut y,
            &format!("Engagement: {} ({})", eng.name, eng.status),
            10.0,
            false,
        );
        write_line(
            &doc,
            &mut current_page,
            &mut current_layer,
            &mut y,
            &format!(
                "Authorized by: {} | Ref: {}",
                eng.authorized_by, eng.authorization_ref
            ),
            9.0,
            false,
        );
        if !eng.scope_targets.is_empty() {
            write_line(
                &doc,
                &mut current_page,
                &mut current_layer,
                &mut y,
                &format!("In-scope: {}", eng.scope_targets.join(", ")),
                9.0,
                false,
            );
        }
    }

    y -= 4.0;
    for line in md.lines() {
        if line.starts_with("# ") {
            y -= 2.0;
            write_line(
                &doc,
                &mut current_page,
                &mut current_layer,
                &mut y,
                line.trim_start_matches("# "),
                13.0,
                true,
            );
        } else if line.starts_with("## ") {
            y -= 1.5;
            write_line(
                &doc,
                &mut current_page,
                &mut current_layer,
                &mut y,
                line.trim_start_matches("## "),
                11.0,
                true,
            );
        } else if line.starts_with("### ") {
            write_line(
                &doc,
                &mut current_page,
                &mut current_layer,
                &mut y,
                line.trim_start_matches("### "),
                10.0,
                true,
            );
        } else if line == "---" {
            y -= 2.0;
        } else if !line.trim().is_empty() {
            write_line(
                &doc,
                &mut current_page,
                &mut current_layer,
                &mut y,
                line.trim_start_matches("- "),
                9.0,
                false,
            );
        }
    }

    let mut buf = Vec::new();
    doc.save(&mut BufWriter::new(&mut buf))
        .map_err(|e| format!("Failed to write PDF: {e}"))?;
    Ok(buf)
}
