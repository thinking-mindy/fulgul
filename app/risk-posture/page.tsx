"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Stack,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import BugReportIcon from '@mui/icons-material/BugReport';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import SectionLabel, { Panel } from '../../components/ui/SectionLabel';
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
    ? <TrendingUpIcon color="success" fontSize="small" />
    : <TrendingDownIcon color="error" fontSize="small" />;

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        eyebrow="Risk analysis"
        title="Risk posture"
        subtitle="Compare scan baselines and track score trends."
      />
      <DefenseWorkspaceBar />
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Total scans" value={summary?.scansTotal ?? 0} icon={<AnalyticsIcon fontSize="small" />} tone="info" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Avg score" value={summary?.averageScore ?? '—'} icon={<AnalyticsIcon fontSize="small" />} tone="success" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard label="Open vulns" value={summary?.vulnerabilitiesTotal ?? 0} icon={<BugReportIcon fontSize="small" />} tone="warning" />
        </Grid>
      </Grid>

      <Panel>
        <SectionLabel>Scan comparison</SectionLabel>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2.5 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Baseline scan</InputLabel>
            <Select label="Baseline scan" value={baseline} onChange={(e) => setBaseline(e.target.value)}>
              {history.map((s) => (
                <MenuItem key={s.scanId} value={s.scanId}>
                  {s.timestamp.slice(0, 10)} — {s.securityScore}/100
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Current scan</InputLabel>
            <Select label="Current scan" value={current} onChange={(e) => setCurrent(e.target.value)}>
              {history.map((s) => (
                <MenuItem key={s.scanId} value={s.scanId}>
                  {s.timestamp.slice(0, 10)} — {s.securityScore}/100
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="success"
            onClick={compare}
            sx={{ minWidth: 120, borderRadius: 2 }}
          >
            Compare
          </Button>
        </Stack>

        {comparison && (
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
              {deltaIcon}
              <Typography sx={{ fontWeight: 700 }}>
                Score {comparison.baselineScore} → {comparison.currentScore}
                {' '}({comparison.scoreDelta >= 0 ? '+' : ''}{comparison.scoreDelta})
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5 }}>
              {comparison.newVulnerabilities.length} new · {comparison.resolvedVulnerabilities.length} resolved ·{' '}
              {comparison.unchangedCount} unchanged
            </Typography>
            {comparison.newVulnerabilities.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="error.main" sx={{ mb: 1, fontWeight: 700 }}>
                  New findings
                </Typography>
                <Stack divider={<Divider />} spacing={0}>
                  {comparison.newVulnerabilities.slice(0, 8).map((v) => (
                    <Typography key={v.id} variant="body2" sx={{ py: 0.75 }}>
                      {v.title}{' '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        ({v.severity})
                      </Typography>
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
            {comparison.resolvedVulnerabilities.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="success.main" sx={{ mb: 1, fontWeight: 700 }}>
                  Resolved
                </Typography>
                <Stack divider={<Divider />} spacing={0}>
                  {comparison.resolvedVulnerabilities.slice(0, 8).map((v) => (
                    <Typography key={v.id} variant="body2" sx={{ py: 0.75 }}>
                      {v.title}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        )}
      </Panel>
    </Box>
  );
}
