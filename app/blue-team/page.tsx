"use client";

import { useState, useEffect, useCallback } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  alpha,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RadarIcon from '@mui/icons-material/Radar';
import BugReportIcon from '@mui/icons-material/BugReport';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import BuildIcon from '@mui/icons-material/Build';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useRouter } from 'next/navigation';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import StatCard from '../../components/ui/StatCard';
import DefenseWorkspaceBar from '../../components/defense/DefenseWorkspaceBar';
import type { DefensePipelineSummary, DefenseWorkspace } from '../../types/tauri';

const PHASES = [
  { id: 'scope', label: 'Asset Scope', desc: 'Register protected assets', path: '/defense-scope', icon: AssignmentIcon, color: '#8b5cf6' },
  { id: 'discovery', label: 'Discovery', desc: 'Local & remote scans', path: '/scan-local', icon: RadarIcon, color: '#3b82f6' },
  { id: 'assessment', label: 'Assessment', desc: 'Vulnerability inventory', path: '/vulnerabilities', icon: BugReportIcon, color: '#06b6d4' },
  { id: 'analysis', label: 'Risk Analysis', desc: 'Trends & comparisons', path: '/risk-posture', icon: AnalyticsIcon, color: '#eab308' },
  { id: 'hardening', label: 'Hardening', desc: 'Remediate & secure', path: '/hardening', icon: BuildIcon, color: '#f97316' },
  { id: 'response', label: 'Response', desc: 'Auto-response playbooks', path: '/response', icon: AutoFixHighIcon, color: '#ef4444' },
  { id: 'reporting', label: 'Reporting', desc: 'Security deliverables', path: '/reports', icon: AssessmentIcon, color: '#22c55e' },
];

export default function BlueTeamPipelinePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<DefensePipelineSummary | null>(null);
  const [workspace, setWorkspace] = useState<DefenseWorkspace | null>(null);

  const load = useCallback(async () => {
    const [s, ws] = await Promise.all([
      invoke<DefensePipelineSummary>('get_defense_pipeline_summary'),
      invoke<DefenseWorkspace>('get_defense_workspace'),
    ]);
    setSummary(s);
    setWorkspace(ws);
  }, []);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const completedPhases = PHASES.filter((p) => (summary?.phaseCounts[p.id] ?? 0) > 0).length;
  const progress = Math.round((completedPhases / PHASES.length) * 100);

  return (
    <Box>
      <PageHeader
        eyebrow="Blue Team · Defense pipeline"
        title="Defend the"
        titleAccent="full stack."
        subtitle="Asset scope, discovery scans, vulnerability assessment, hardening, and response — all sharing one defensive workspace."
        chips={['Shared workspace', 'Auto-sync', '7 phases']}
        actions={
          <Tooltip title="Refresh">
            <IconButton onClick={load} color="success"><RefreshIcon /></IconButton>
          </Tooltip>
        }
      />

      <DefenseWorkspaceBar onUpdate={setWorkspace} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Assets" value={summary?.assetsRegistered ?? 0} icon={<ShieldIcon />} tone="success" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Avg score" value={summary?.averageScore ?? '—'} icon={<AnalyticsIcon />} tone="primary" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Critical vulns" value={summary?.criticalVulns ?? 0} icon={<BugReportIcon />} tone="error" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Pending fixes" value={summary?.pendingHardening ?? 0} icon={<BuildIcon />} tone="warning" />
        </Grid>
      </Grid>

      <GlassCard sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>Defense posture progress</Typography>
          <Chip label={`${progress}%`} size="small" color="success" />
        </Stack>
        <LinearProgress variant="determinate" value={progress} color="success" sx={{ height: 8, borderRadius: 99, mb: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {summary?.engagementName ? `Engagement: ${summary.engagementName}` : 'Register assets in Scope to begin'}
          {workspace?.primaryAsset ? ` · Focus: ${workspace.primaryAsset}` : ''}
        </Typography>
      </GlassCard>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Defense phases</Typography>
      <Grid container spacing={2}>
        {PHASES.map((phase, idx) => {
          const Icon = phase.icon;
          const count = summary?.phaseCounts[phase.id] ?? 0;
          const status = summary?.phaseStatus[phase.id] ?? 'idle';
          return (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={phase.id}>
              <GlassCard
                highlight={status === 'active'}
                onClick={() => router.push(phase.path)}
                sx={{ cursor: 'pointer', position: 'relative', '&:hover': { borderColor: phase.color, transform: 'translateY(-2px)' }, transition: 'all 0.2s' }}
              >
                <Box sx={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(phase.color, 0.12), color: phase.color, fontSize: '0.7rem', fontWeight: 800 }}>
                  {idx + 1}
                </Box>
                <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(phase.color, 0.12), color: phase.color }}>
                    <Icon />
                  </Box>
                  <Box>
                    <Typography fontWeight={800}>{phase.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{phase.desc}</Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={0.75}>
                  <Chip label={`${count} tracked`} size="small" variant="outlined" />
                  <Chip label={status} size="small" sx={{ bgcolor: alpha(phase.color, 0.12), color: phase.color, fontWeight: 700, fontSize: '0.6rem' }} />
                </Stack>
                <Button size="small" endIcon={<ArrowForwardIcon />} sx={{ mt: 1.5, color: phase.color }} onClick={(e) => { e.stopPropagation(); router.push(phase.path); }}>
                  Open phase
                </Button>
              </GlassCard>
            </Grid>
          );
        })}
      </Grid>

      {workspace && workspace.assets.length > 0 && (
        <GlassCard sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Registered assets</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {workspace.assets.map((a) => (
              <Chip
                key={a.id}
                label={`${a.hostname}${a.lastScore != null ? ` · ${a.lastScore}/100` : ''}`}
                size="small"
                color={a.criticality === 'critical' ? 'error' : 'default'}
                variant="outlined"
              />
            ))}
          </Stack>
        </GlassCard>
      )}
    </Box>
  );
}
