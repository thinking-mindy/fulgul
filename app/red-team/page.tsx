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
import GavelIcon from '@mui/icons-material/Gavel';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import BugReportIcon from '@mui/icons-material/BugReport';
import SecurityIcon from '@mui/icons-material/Security';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssessmentIcon from '@mui/icons-material/Assessment';
import KeyIcon from '@mui/icons-material/Key';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { useRouter } from 'next/navigation';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import SectionLabel, { Panel } from '../../components/ui/SectionLabel';
import WorkspaceBar from '../../components/pentest/WorkspaceBar';
import type { PipelineSummary, PentestWorkspace } from '../../types/tauri';

const PHASES = [
  { id: 'planning', label: 'Planning', desc: 'Scope & authorization', path: '/engagement', icon: AssignmentIcon },
  { id: 'recon', label: 'Recon', desc: 'OSINT & surface map', path: '/recon', icon: TravelExploreIcon },
  { id: 'enumeration', label: 'Enumeration', desc: 'Ports, subs, paths', path: '/enumerate', icon: ManageSearchIcon },
  { id: 'vulnerability', label: 'Vuln Analysis', desc: 'Scan & assess', path: '/scan-remote', icon: BugReportIcon },
  { id: 'exploitation', label: 'Exploitation', desc: 'Labs & cred attacks', path: '/attacks', icon: SecurityIcon },
  { id: 'post_exploit', label: 'Post-Exploit', desc: 'Loot & persistence', path: '/loot', icon: InventoryIcon },
  { id: 'reporting', label: 'Reporting', desc: 'Client deliverables', path: '/reports', icon: AssessmentIcon },
];

export default function RedTeamPipelinePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [workspace, setWorkspace] = useState<PentestWorkspace | null>(null);

  const load = useCallback(async () => {
    const [s, ws] = await Promise.all([
      invoke<PipelineSummary>('get_pipeline_summary'),
      invoke<PentestWorkspace>('get_pentest_workspace'),
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
        eyebrow="Red Team"
        title="Kill chain pipeline"
        subtitle="Every phase shares targets, findings, and loot through one workspace."
        actions={
          <Tooltip title="Refresh">
            <IconButton onClick={load} size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        }
      />

      <WorkspaceBar onUpdate={setWorkspace} />

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Targets" value={summary?.targetsDiscovered ?? 0} icon={<GavelIcon fontSize="small" />} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Activities" value={summary?.activitiesTotal ?? 0} icon={<TravelExploreIcon fontSize="small" />} tone="info" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Loot" value={summary?.lootCount ?? 0} icon={<KeyIcon fontSize="small" />} tone="warning" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Reports" value={summary?.reportsCount ?? 0} icon={<AssessmentIcon fontSize="small" />} tone="success" />
        </Grid>
      </Grid>

      <Panel sx={{ mb: 3, p: 2.25 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Engagement progress
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
            {progress}%
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 4, borderRadius: 99, mb: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {summary?.engagementName ? `Active: ${summary.engagementName}` : 'No engagement — start in Planning'}
          {workspace?.primaryTarget ? ` · Target: ${workspace.primaryTarget}` : ''}
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
                    {count} logged · {status}
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
