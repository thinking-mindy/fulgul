'use client';

import { useState, useEffect, useCallback } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Stack,
  LinearProgress,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentIcon from '@mui/icons-material/Assignment';
import RadarIcon from '@mui/icons-material/Radar';
import BugReportIcon from '@mui/icons-material/BugReport';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import BuildIcon from '@mui/icons-material/Build';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { useRouter } from 'next/navigation';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import SectionLabel, { Panel } from '../../components/ui/SectionLabel';
import DefenseWorkspaceBar from '../../components/defense/DefenseWorkspaceBar';
import type { DefensePipelineSummary, DefenseWorkspace } from '../../types/tauri';

const PHASES = [
  { id: 'scope', label: 'Asset Scope', desc: 'Register protected assets', path: '/defense-scope', icon: AssignmentIcon },
  { id: 'discovery', label: 'Discovery', desc: 'Local & remote scans', path: '/scan-local', icon: RadarIcon },
  { id: 'assessment', label: 'Assessment', desc: 'Vulnerability inventory', path: '/vulnerabilities', icon: BugReportIcon },
  { id: 'analysis', label: 'Risk Analysis', desc: 'Trends & comparisons', path: '/risk-posture', icon: AnalyticsIcon },
  { id: 'hardening', label: 'Hardening', desc: 'Remediate & secure', path: '/hardening', icon: BuildIcon },
  { id: 'response', label: 'Response', desc: 'Auto-response playbooks', path: '/response', icon: AutoFixHighIcon },
  { id: 'reporting', label: 'Reporting', desc: 'Security deliverables', path: '/reports', icon: AssessmentIcon },
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

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const completedPhases = PHASES.filter((p) => (summary?.phaseCounts[p.id] ?? 0) > 0).length;
  const progress = Math.round((completedPhases / PHASES.length) * 100);

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        eyebrow="Blue Team"
        title="Defense pipeline"
        subtitle="Scope, scan, harden, and respond from one shared workspace."
        actions={
          <Tooltip title="Refresh">
            <IconButton onClick={load} size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        }
      />

      <DefenseWorkspaceBar onUpdate={setWorkspace} />

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Assets" value={summary?.assetsRegistered ?? 0} icon={<ShieldIcon fontSize="small" />} tone="success" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Avg score" value={summary?.averageScore ?? '—'} icon={<AnalyticsIcon fontSize="small" />} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Critical" value={summary?.criticalVulns ?? 0} icon={<BugReportIcon fontSize="small" />} tone="error" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Pending" value={summary?.pendingHardening ?? 0} icon={<BuildIcon fontSize="small" />} tone="warning" />
        </Grid>
      </Grid>

      <Panel sx={{ mb: 3, p: 2.25 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Pipeline progress
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {progress}%
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={progress} color="success" sx={{ height: 4, borderRadius: 99, mb: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {summary?.engagementName ? `Engagement: ${summary.engagementName}` : 'Register assets in Scope to begin'}
          {workspace?.primaryAsset ? ` · Focus: ${workspace.primaryAsset}` : ''}
        </Typography>
      </Panel>

      <SectionLabel>Phases</SectionLabel>
      <Grid container spacing={1.5}>
        {PHASES.map((phase, idx) => {
          const Icon = phase.icon;
          const count = summary?.phaseCounts[phase.id] ?? 0;
          const status = summary?.phaseStatus[phase.id] ?? 'idle';
          return (
            <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={phase.id}>
              <Panel onClick={() => router.push(phase.path)}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.25 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                      color: 'primary.main',
                    }}
                  >
                    <Icon fontSize="small" />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {String(idx + 1).padStart(2, '0')}
                  </Typography>
                </Stack>
                <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.35 }}>{phase.label}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
                  {phase.desc}
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    {count} tracked · {status}
                  </Typography>
                  <NorthEastIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.45 }} />
                </Stack>
              </Panel>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
