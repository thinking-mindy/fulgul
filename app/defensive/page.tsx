"use client";

import { useState, useEffect, useCallback } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import SecurityIcon from '@mui/icons-material/Security';
import BugReportIcon from '@mui/icons-material/BugReport';
import BuildIcon from '@mui/icons-material/Build';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import HistoryIcon from '@mui/icons-material/History';
import TerminalIcon from '@mui/icons-material/Terminal';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useRouter } from 'next/navigation';
import { invoke } from '@tauri-apps/api/core';
import type { StoredScanResult, StoredVulnerability } from '../../types/tauri';
import {
  averageSecurityScore,
  gradeFromScore,
  normalizeScanHistory,
  normalizeStoredVulnerability,
} from '../../lib/scan';
import { formatTimeAgo } from '../../hooks/useSecurityOverview';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import FeatureTile from '../../components/ui/FeatureTile';
import GlassCard from '../../components/ui/GlassCard';
import SecurityScoreGauge from '../../components/SecurityScoreGauge';

export default function DefensiveSecurityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVulnerabilities: 0,
    criticalVulnerabilities: 0,
    highVulnerabilities: 0,
    mediumVulnerabilities: 0,
    lowVulnerabilities: 0,
    fixedVulnerabilities: 0,
    pendingVulnerabilities: 0,
    totalScans: 0,
    averageScore: 0,
    securityGrade: 'Unknown',
    recentScans: [] as StoredScanResult[],
    recentVulnerabilities: [] as Array<StoredVulnerability & { scanId: string }>,
    hardeningTasksApplied: 0,
    hardeningTasksPending: 0,
  });

  const loadDefensiveData = useCallback(async () => {
    setLoading(true);
    try {
      const history = normalizeScanHistory(await invoke<unknown[]>('get_scan_history'));
      const allVulns = await invoke<Array<[Record<string, unknown>, string]>>('get_all_vulnerabilities');

      const vulns = allVulns.map(([v, scanId]) => ({
        ...normalizeStoredVulnerability(v),
        scanId,
      }));

      const totalVulns = vulns.length;
      const criticalVulns = vulns.filter((v) => v.severity.toLowerCase() === 'critical').length;
      const highVulns = vulns.filter((v) => v.severity.toLowerCase() === 'high').length;
      const mediumVulns = vulns.filter((v) => v.severity.toLowerCase() === 'medium').length;
      const lowVulns = vulns.filter((v) => v.severity.toLowerCase() === 'low').length;
      const fixedVulns = vulns.filter((v) => v.status === 'fixed').length;
      const pendingVulns = vulns.filter((v) => v.status === 'pending').length;
      const averageScore = averageSecurityScore(history);

      const recentScans = [...history]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

      const recentVulns = [...vulns]
        .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
        .slice(0, 5);

      setStats({
        totalVulnerabilities: totalVulns,
        criticalVulnerabilities: criticalVulns,
        highVulnerabilities: highVulns,
        mediumVulnerabilities: mediumVulns,
        lowVulnerabilities: lowVulns,
        fixedVulnerabilities: fixedVulns,
        pendingVulnerabilities: pendingVulns,
        totalScans: history.length,
        averageScore,
        securityGrade: gradeFromScore(averageScore),
        recentScans,
        recentVulnerabilities: recentVulns,
        hardeningTasksApplied: fixedVulns,
        hardeningTasksPending: pendingVulns,
      });
    } catch (err) {
      console.error('Failed to load defensive data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefensiveData();
    const interval = setInterval(loadDefensiveData, 30000);
    return () => clearInterval(interval);
  }, [loadDefensiveData]);

  const fixRate =
    stats.totalVulnerabilities > 0
      ? Math.round((stats.fixedVulnerabilities / stats.totalVulnerabilities) * 100)
      : 0;

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <ErrorIcon />;
      case 'high':
      case 'medium':
        return <WarningIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const defensiveTools = [
    {
      title: 'Scan Local Machine',
      description: 'Comprehensive vulnerability scan of your local system',
      icon: <SecurityIcon />,
      path: '/scan-local',
      tag: 'Detect',
    },
    {
      title: 'Scan Remote IP',
      description: 'Scan network devices for open ports and vulnerabilities',
      icon: <SecurityIcon />,
      path: '/scan-remote',
      tag: 'Network',
    },
    {
      title: 'View Vulnerabilities',
      description: 'Review and manage all detected vulnerabilities',
      icon: <BugReportIcon />,
      path: '/vulnerabilities',
      tag: stats.totalVulnerabilities > 0 ? String(stats.totalVulnerabilities) : undefined,
    },
    {
      title: 'Harden Systems',
      description: 'Apply guided hardening tasks to secure your system',
      icon: <BuildIcon />,
      path: '/hardening',
      tag: stats.hardeningTasksPending > 0 ? String(stats.hardeningTasksPending) : undefined,
    },
    {
      title: 'Scan History',
      description: 'View complete audit trail of all scans',
      icon: <HistoryIcon />,
      path: '/scan-history',
      tag: stats.totalScans > 0 ? String(stats.totalScans) : undefined,
    },
    {
      title: 'Auto Response',
      description: 'Configure automated security responses — now persists and logs on scan',
      icon: <AutoFixHighIcon />,
      path: '/response',
      tag: 'Respond',
    },
    {
      title: 'Security Shell',
      description: 'Run live diagnostics and remediation commands',
      icon: <TerminalIcon />,
      path: '/terminal',
      tag: 'Shell',
    },
    {
      title: 'Compare Scans',
      description: 'Diff two scans to see new and resolved findings',
      icon: <CompareArrowsIcon />,
      path: '/scan-history',
      tag: stats.totalScans >= 2 ? 'Trend' : undefined,
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        eyebrow="Defensive · Detect"
        title="Harden posture."
        titleAccent="Stay ahead of threats."
        subtitle="Proactive defense through vulnerability scanning, system hardening, and automated response — the same security-first mindset as Thinking Minds."
        chips={['Scan', 'Triage', 'Harden', 'Respond']}
        actions={
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <IconButton onClick={loadDefensiveData} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => router.push('/scan-local')}>
              Run scan
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <GlassCard>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em' }}>
              Security score
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mt: 1 }}>
              <SecurityScoreGauge
                score={stats.averageScore}
                grade={stats.totalScans > 0 ? stats.securityGrade : 'No scans'}
                compact
              />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Average from {stats.totalScans} scan{stats.totalScans !== 1 ? 's' : ''}
                </Typography>
                {stats.totalScans === 0 && (
                  <Button size="small" onClick={() => router.push('/scan-local')}>
                    Run first scan
                  </Button>
                )}
              </Box>
            </Box>
          </GlassCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="Vulnerabilities"
            value={stats.totalVulnerabilities}
            hint={`${stats.fixedVulnerabilities} fixed · ${stats.pendingVulnerabilities} pending`}
            icon={<BugReportIcon />}
            progress={fixRate}
            tone={stats.criticalVulnerabilities + stats.highVulnerabilities > 0 ? 'error' : 'primary'}
          />
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1.5, px: 0.5 }}>
            <Chip label={`${stats.criticalVulnerabilities} Critical`} size="small" color="error" />
            <Chip label={`${stats.highVulnerabilities} High`} size="small" color="error" variant="outlined" />
            <Chip label={`${stats.mediumVulnerabilities} Medium`} size="small" color="warning" />
            <Chip label={`${stats.lowVulnerabilities} Low`} size="small" color="info" />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="Hardening"
            value={stats.hardeningTasksApplied}
            hint={`${stats.hardeningTasksPending} tasks still pending`}
            icon={<CheckCircleIcon />}
            tone={stats.hardeningTasksPending > 0 ? 'warning' : 'success'}
          />
          {stats.hardeningTasksPending > 0 && (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              {stats.hardeningTasksPending} hardening task{stats.hardeningTasksPending !== 1 ? 's' : ''} pending
            </Alert>
          )}
        </Grid>
      </Grid>

      <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.1em', color: 'text.secondary', mb: 2, display: 'block' }}>
        Defensive tools
      </Typography>
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {defensiveTools.map((tool) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tool.path}>
            <FeatureTile
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              tag={tool.tag}
              onClick={() => router.push(tool.path)}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <GlassCard>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Recent scans
            </Typography>
            {stats.recentScans.length === 0 ? (
              <Alert severity="info">No scans yet. Start with a local machine scan.</Alert>
            ) : (
              <List disablePadding>
                {stats.recentScans.map((scan, index) => (
                  <Box key={scan.scanId}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>
                        <SecurityIcon
                          color={scan.securityScore >= 70 ? 'success' : scan.securityScore >= 50 ? 'warning' : 'error'}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {scan.os}
                            </Typography>
                            <Chip
                              label={`Score ${scan.securityScore}`}
                              size="small"
                              color={scan.securityScore >= 70 ? 'success' : scan.securityScore >= 50 ? 'warning' : 'error'}
                            />
                          </Box>
                        }
                        secondary={formatTimeAgo(scan.timestamp)}
                      />
                      <Button size="small" onClick={() => router.push('/scan-history')}>
                        View
                      </Button>
                    </ListItem>
                    {index < stats.recentScans.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </GlassCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <GlassCard>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Recent vulnerabilities
            </Typography>
            {stats.recentVulnerabilities.length === 0 ? (
              <Alert severity="success">No vulnerabilities on record.</Alert>
            ) : (
              <List disablePadding>
                {stats.recentVulnerabilities.map((vuln, index) => (
                  <Box key={vuln.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon>{getSeverityIcon(vuln.severity)}</ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {vuln.title}
                            </Typography>
                            <Chip label={vuln.severity} size="small" color={getSeverityColor(vuln.severity) as 'error' | 'warning' | 'info'} />
                          </Box>
                        }
                        secondary={formatTimeAgo(vuln.detectedAt)}
                      />
                      <Button size="small" onClick={() => router.push('/vulnerabilities')}>
                        View
                      </Button>
                    </ListItem>
                    {index < stats.recentVulnerabilities.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
}
