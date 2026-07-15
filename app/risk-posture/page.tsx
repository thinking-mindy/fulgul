"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import { Box, Typography, Stack, Chip, Alert, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import StatCard from '../../components/ui/StatCard';
import DefenseWorkspaceBar from '../../components/defense/DefenseWorkspaceBar';
import type { ScanComparison, StoredScanResult, DefensePipelineSummary } from '../../types/tauri';

export default function RiskPosturePage() {
  const [history, setHistory] = useState<StoredScanResult[]>([]);
  const [baseline, setBaseline] = useState('');
  const [current, setCurrent] = useState('');
  const [comparison, setComparison] = useState<ScanComparison | null>(null);
  const [summary, setSummary] = useState<DefensePipelineSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      invoke<StoredScanResult[]>('get_scan_history'),
      invoke<DefensePipelineSummary>('get_defense_pipeline_summary'),
    ]).then(([h, s]) => {
      setHistory(h);
      setSummary(s);
      if (h.length >= 2) {
        setBaseline(h[h.length - 2].scanId);
        setCurrent(h[h.length - 1].scanId);
      } else if (h.length === 1) {
        setCurrent(h[0].scanId);
      }
    }).catch(() => {});
  }, []);

  const compare = async () => {
    if (!baseline || !current) return;
    try {
      const result = await invoke<ScanComparison>('compare_scans', {
        baselineScanId: baseline,
        currentScanId: current,
      });
      setComparison(result);
    } catch (e) {
      setError(String(e));
    }
  };

  const deltaIcon = comparison && comparison.scoreDelta >= 0
    ? <TrendingUpIcon color="success" />
    : <TrendingDownIcon color="error" />;

  return (
    <Box>
      <PageHeader eyebrow="Phase 4 · Risk analysis" title="Measure" titleAccent="your posture." subtitle="Compare scan baselines, track score trends, and prioritize remediation from shared defensive data." chips={['Scan compare', 'Score delta', 'Trend analysis']} />
      <DefenseWorkspaceBar />
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 4 }}><StatCard label="Total scans" value={summary?.scansTotal ?? 0} icon={<AnalyticsIcon />} tone="info" /></Grid>
        <Grid size={{ xs: 4 }}><StatCard label="Avg score" value={summary?.averageScore ?? '—'} icon={<AnalyticsIcon />} tone="success" /></Grid>
        <Grid size={{ xs: 4 }}><StatCard label="Open vulns" value={summary?.vulnerabilitiesTotal ?? 0} icon={<AnalyticsIcon />} tone="warning" /></Grid>
      </Grid>

      <GlassCard>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Scan comparison</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Baseline scan</InputLabel>
            <Select label="Baseline scan" value={baseline} onChange={(e) => setBaseline(e.target.value)}>
              {history.map((s) => (
                <MenuItem key={s.scanId} value={s.scanId}>{s.timestamp.slice(0, 10)} — {s.securityScore}/100</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Current scan</InputLabel>
            <Select label="Current scan" value={current} onChange={(e) => setCurrent(e.target.value)}>
              {history.map((s) => (
                <MenuItem key={s.scanId} value={s.scanId}>{s.timestamp.slice(0, 10)} — {s.securityScore}/100</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" color="success" onClick={compare} sx={{ minWidth: 120 }}>Compare</Button>
        </Stack>

        {comparison && (
          <Box>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              {deltaIcon}
              <Typography fontWeight={700}>
                Score {comparison.baselineScore} → {comparison.currentScore}
                {' '}({comparison.scoreDelta >= 0 ? '+' : ''}{comparison.scoreDelta})
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip label={`${comparison.newVulnerabilities.length} new`} color="error" size="small" />
              <Chip label={`${comparison.resolvedVulnerabilities.length} resolved`} color="success" size="small" />
              <Chip label={`${comparison.unchangedCount} unchanged`} size="small" variant="outlined" />
            </Stack>
            {comparison.newVulnerabilities.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="error.main" sx={{ mb: 1 }}>New findings</Typography>
                {comparison.newVulnerabilities.slice(0, 8).map((v) => (
                  <Typography key={v.id} variant="body2">• {v.title} ({v.severity})</Typography>
                ))}
              </Box>
            )}
            {comparison.resolvedVulnerabilities.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="success.main" sx={{ mb: 1 }}>Resolved</Typography>
                {comparison.resolvedVulnerabilities.slice(0, 8).map((v) => (
                  <Typography key={v.id} variant="body2">• {v.title}</Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </GlassCard>
    </Box>
  );
}
