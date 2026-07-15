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
import GavelIcon from '@mui/icons-material/Gavel';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import BugReportIcon from '@mui/icons-material/BugReport';
import SecurityIcon from '@mui/icons-material/Security';
import KeyIcon from '@mui/icons-material/Key';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useRouter } from 'next/navigation';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import StatCard from '../../components/ui/StatCard';
import WorkspaceBar from '../../components/pentest/WorkspaceBar';
import type { PipelineSummary, PentestWorkspace } from '../../types/tauri';

const PHASES = [
  { id: 'planning', label: 'Planning', desc: 'Scope & authorization', path: '/engagement', icon: AssignmentIcon, color: '#8b5cf6' },
  { id: 'recon', label: 'Recon', desc: 'OSINT & surface map', path: '/recon', icon: TravelExploreIcon, color: '#3b82f6' },
  { id: 'enumeration', label: 'Enumeration', desc: 'Ports, subs, paths', path: '/enumerate', icon: ManageSearchIcon, color: '#06b6d4' },
  { id: 'vulnerability', label: 'Vuln Analysis', desc: 'Scan & assess', path: '/scan-remote', icon: BugReportIcon, color: '#eab308' },
  { id: 'exploitation', label: 'Exploitation', desc: 'Labs & cred attacks', path: '/attacks', icon: SecurityIcon, color: '#f97316' },
  { id: 'post_exploit', label: 'Post-Exploit', desc: 'Loot & persistence', path: '/loot', icon: InventoryIcon, color: '#ef4444' },
  { id: 'reporting', label: 'Reporting', desc: 'Client deliverables', path: '/reports', icon: AssessmentIcon, color: '#22c55e' },
];

export default function RedTeamPipelinePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [workspace, setWorkspace] = useState<PentestWorkspace | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, ws] = await Promise.all([
        invoke<PipelineSummary>('get_pipeline_summary'),
        invoke<PentestWorkspace>('get_pentest_workspace'),
      ]);
      setSummary(s);
      setWorkspace(ws);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const completedPhases = PHASES.filter((p) => (summary?.phaseCounts[p.id] ?? 0) > 0).length;
  const progress = Math.round((completedPhases / PHASES.length) * 100);

  return (
    <Box>
      <PageHeader
        eyebrow="Red Team · Full pipeline"
        title="Kill chain,"
        titleAccent="end to end."
        subtitle="Every phase shares data through the engagement workspace — targets, findings, loot, and reports flow together."
        chips={['Shared workspace', 'Auto-logged', '7 phases']}
        actions={
          <Tooltip title="Refresh pipeline">
            <IconButton onClick={load} color="primary"><RefreshIcon /></IconButton>
          </Tooltip>
        }
      />

      <WorkspaceBar onUpdate={setWorkspace} />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Targets mapped" value={summary?.targetsDiscovered ?? 0} icon={<GavelIcon />} tone="primary" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Activities" value={summary?.activitiesTotal ?? 0} icon={<TravelExploreIcon />} tone="info" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Loot captured" value={summary?.lootCount ?? 0} icon={<KeyIcon />} tone="warning" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Reports" value={summary?.reportsCount ?? 0} icon={<AssessmentIcon />} tone="success" />
        </Grid>
      </Grid>

      <GlassCard sx={{ mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>Engagement progress</Typography>
          <Chip label={`${progress}%`} size="small" color="primary" />
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 99, mb: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {summary?.engagementName ? `Active: ${summary.engagementName}` : 'No engagement — start in Planning'}
          {workspace?.primaryTarget ? ` · Target: ${workspace.primaryTarget}` : ''}
        </Typography>
      </GlassCard>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Pentest phases</Typography>
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
                sx={{
                  cursor: 'pointer',
                  '&:hover': { borderColor: phase.color, transform: 'translateY(-2px)' },
                  transition: 'all 0.2s ease',
                }}
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
                  <Chip label={`${count} logged`} size="small" variant="outlined" />
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

      {workspace && (workspace.domains.length > 0 || workspace.targets.length > 0) && (
        <GlassCard sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Shared intelligence</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {workspace.domains.slice(0, 8).map((d) => <Chip key={d} label={d} size="small" variant="outlined" />)}
            {workspace.targets.slice(0, 5).map((t) => (
              <Chip key={t.id} label={`${t.host}${t.ports.length ? ` :${t.ports.join(',')}` : ''}`} size="small" color="primary" variant="outlined" />
            ))}
          </Stack>
        </GlassCard>
      )}
    </Box>
  );
}
