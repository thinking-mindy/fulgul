import type { StoredScanResult, StoredVulnerability } from '../types/tauri';

/** Normalize scan records from Tauri (camelCase or legacy snake_case on disk). */
export function normalizeStoredScan(raw: Record<string, unknown>): StoredScanResult {
  const scoreRaw = raw.securityScore ?? raw.security_score;
  const parsed = Number(scoreRaw);
  const securityScore = Number.isFinite(parsed) ? parsed : 0;

  const vulnsRaw = (raw.vulnerabilities ?? []) as Record<string, unknown>[];

  return {
    scanId: String(raw.scanId ?? raw.scan_id ?? ''),
    timestamp: String(raw.timestamp ?? ''),
    os: String(raw.os ?? 'Unknown'),
    securityScore,
    securityGrade: String(raw.securityGrade ?? raw.security_grade ?? 'Unknown'),
    vulnerabilities: vulnsRaw.map(normalizeStoredVulnerability),
  };
}

export function normalizeStoredVulnerability(raw: Record<string, unknown>): StoredVulnerability {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    severity: (raw.severity as StoredVulnerability['severity']) ?? 'medium',
    description: String(raw.description ?? ''),
    suggestedFix: String(raw.suggestedFix ?? raw.suggested_fix ?? ''),
    status: (raw.status as StoredVulnerability['status']) ?? 'pending',
    cve: raw.cve ? String(raw.cve) : undefined,
    affectedSystems: (raw.affectedSystems ?? raw.affected_systems ?? []) as string[],
    detectedAt: String(raw.detectedAt ?? raw.detected_at ?? ''),
    remediation: String(raw.remediation ?? ''),
  };
}

export function normalizeScanHistory(history: unknown[]): StoredScanResult[] {
  return history.map((item) => normalizeStoredScan(item as Record<string, unknown>));
}

export function averageSecurityScore(scans: StoredScanResult[]): number {
  if (scans.length === 0) return 0;
  const scores = scans
    .map((s) => s.securityScore)
    .filter((n) => Number.isFinite(n));
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length);
}

export function gradeFromScore(score: number): string {
  if (!Number.isFinite(score) || score <= 0) return 'Unknown';
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Moderate';
  if (score >= 30) return 'Risky';
  return 'Critical';
}
