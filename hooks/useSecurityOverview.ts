'use client';

import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { StoredScanResult, StoredVulnerability } from '../types/tauri';
import {
  averageSecurityScore,
  gradeFromScore,
  normalizeScanHistory,
  normalizeStoredVulnerability,
} from '../lib/scan';

export type VulnWithScan = StoredVulnerability & {
  scanId: string;
  scanTimestamp: string;
};

export interface SecurityOverview {
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  fixedVulnerabilities: number;
  pendingVulnerabilities: number;
  totalScans: number;
  averageScore: number;
  recentScans: StoredScanResult[];
  recentVulnerabilities: VulnWithScan[];
  securityGrade: 'excellent' | 'good' | 'moderate' | 'risky' | 'unknown';
}

const emptyOverview: SecurityOverview = {
  totalVulnerabilities: 0,
  criticalVulnerabilities: 0,
  fixedVulnerabilities: 0,
  pendingVulnerabilities: 0,
  totalScans: 0,
  averageScore: 0,
  recentScans: [],
  recentVulnerabilities: [],
  securityGrade: 'unknown',
};

function overviewGrade(score: number): SecurityOverview['securityGrade'] {
  const g = gradeFromScore(score).toLowerCase();
  if (g === 'excellent' || g === 'good' || g === 'moderate' || g === 'risky') return g;
  return 'unknown';
}

export function useSecurityOverview(refreshMs = 0) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<SecurityOverview>(emptyOverview);

  const refresh = useCallback(async () => {
    try {
      const history = normalizeScanHistory(await invoke<unknown[]>('get_scan_history'));
      const allVulns = await invoke<Array<[Record<string, unknown>, string]>>('get_all_vulnerabilities');

      const vulnsWithScanId: VulnWithScan[] = allVulns.map(([v, scanId]) => {
        const scan = history.find((s) => s.scanId === scanId);
        return {
          ...normalizeStoredVulnerability(v),
          scanId,
          scanTimestamp: scan?.timestamp || '',
        };
      });

      const totalVulns = vulnsWithScanId.length;
      const criticalVulns = vulnsWithScanId.filter(
        (v) => v.severity.toLowerCase() === 'critical' || v.severity.toLowerCase() === 'high',
      ).length;
      const fixedVulns = vulnsWithScanId.filter((v) => v.status === 'fixed').length;
      const pendingVulns = vulnsWithScanId.filter((v) => v.status === 'pending').length;
      const averageScore = averageSecurityScore(history);

      const recentVulns = [...vulnsWithScanId]
        .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
        .slice(0, 8);

      setOverview({
        totalVulnerabilities: totalVulns,
        criticalVulnerabilities: criticalVulns,
        fixedVulnerabilities: fixedVulns,
        pendingVulnerabilities: pendingVulns,
        totalScans: history.length,
        averageScore,
        recentScans: history.slice(0, 6),
        recentVulnerabilities: recentVulns,
        securityGrade: overviewGrade(averageScore),
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (refreshMs <= 0) return undefined;
    const id = setInterval(refresh, refreshMs);
    return () => clearInterval(id);
  }, [refresh, refreshMs]);

  return { overview, loading, error, refresh };
}

export function formatTimeAgo(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
