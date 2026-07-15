"use client";

import { useState, useEffect, useCallback } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import SecurityIcon from '@mui/icons-material/Security';
import BugReportIcon from '@mui/icons-material/BugReport';
import BuildIcon from '@mui/icons-material/Build';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import HistoryIcon from '@mui/icons-material/History';
import TerminalIcon from '@mui/icons-material/Terminal';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
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
import FeatureTile from '../../components/ui/FeatureTile';
import SectionLabel from '../../components/ui/SectionLabel';
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

  const defensiveTools = [
    {
      title: 'Scan Local Machine',
      description: 'Packages, misconfigs, and local exposure.',
      icon: <SecurityIcon fontSize="small" />,
      path: '/scan-local',
    },
    {
      title: 'Scan Remote IP',
      description: 'Ports, banners, and network exposure.',
      icon: <SecurityIcon fontSize="small" />,
      path: '/scan-remote',
    },
    {
      title: 'View Vulnerabilities',
      description: 'Triage and track open findings.',
      icon: <BugReportIcon fontSize="small" />,
      path: '/vulnerabilities',
    },
    {
      title: 'Harden Systems',
      description: 'Guided fixes with clear impact notes.',
      icon: <BuildIcon fontSize="small" />,
      path: '/hardening',
    },
    {
      title: 'Scan History',
      description: 'Full audit trail of prior scans.',
      icon: <HistoryIcon fontSize="small" />,
      path: '/scan-history',
    },
    {
      title: 'Auto Response',
      description: 'Patch, quarantine, and notify on scan.',
      icon: <AutoFixHighIcon fontSize="small" />,
      path: '/response',
    },
    {
      title: 'Security Shell',
      description: 'Live diagnostics and remediation.',
      icon: <TerminalIcon fontSize="small" />,
      path: '/terminal',
    },
    {
      title: 'Compare Scans',
      description: 'Diff new and resolved findings.',
      icon: <CompareArrowsIcon fontSize="small" />,
      path: '/scan-history',
    },
  ];

  const vitals = [
    {
      label: 'Open findings',
      value: stats.totalVulnerabilities,
      detail:
        stats.criticalVulnerabilities + stats.highVulnerabilities > 0
          ? `${stats.criticalVulnerabilities} critical · ${stats.highVulnerabilities} high`
          : `${stats.mediumVulnerabilities} medium · ${stats.lowVulnerabilities} low`,
      icon: <BugReportIcon fontSize="small" />,
      tone: stats.criticalVulnerabilities + stats.highVulnerabilities > 0 ? 'error.main' : 'text.primary',
    },
    {
      label: 'Remediation',
      value: `${fixRate}%`,
      detail: `${stats.fixedVulnerabilities} fixed · ${stats.pendingVulnerabilities} pending`,
      icon: <CheckCircleIcon fontSize="small" />,
      tone: 'success.main',
    },
    {
      label: 'Hardening',
      value: stats.hardeningTasksApplied,
      detail:
        stats.hardeningTasksPending > 0
          ? `${stats.hardeningTasksPending} tasks still pending`
          : 'No pending hardening tasks',
      icon: <WarningIcon fontSize="small" />,
      tone: stats.hardeningTasksPending > 0 ? 'warning.main' : 'success.main',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 420 }}>
        <CircularProgress size={32} thickness={3} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        eyebrow="Defensive hub"
        title="Defense posture"
        subtitle="Scan, triage, harden, and respond from one workspace."
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Refresh">
              <IconButton
                onClick={loadDefensiveData}
                size="small"
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => router.push('/scan-local')}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Run scan
            </Button>
          </Stack>
        }
      />

      {/* Posture hero */}
      <Box
        sx={{
          mb: 4,
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Grid container spacing={{ xs: 3, md: 4 }} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <SecurityScoreGauge
                score={stats.averageScore}
                grade={stats.totalScans > 0 ? stats.securityGrade : undefined}
                compact
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
              {stats.totalScans > 0
                ? `${stats.totalScans} scan${stats.totalScans !== 1 ? 's' : ''} on record`
                : 'Run a scan to establish your baseline'}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />}
              spacing={0}
              sx={{
                border: '1px solid',
                borderColor: (t) => alpha(t.palette.divider, 0.8),
                borderRadius: 2.5,
                overflow: 'hidden',
              }}
            >
              {vitals.map((item, i) => (
                <Box
                  key={item.label}
                  sx={{
                    flex: 1,
                    p: 2.5,
                    borderBottom: {
                      xs: i < vitals.length - 1 ? '1px solid' : 'none',
                      sm: 'none',
                    },
                    borderColor: 'divider',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                        color: 'primary.main',
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}
                    >
                      {item.label}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.04em', color: item.tone, lineHeight: 1 }}>
                    {item.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                    {item.detail}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 4 }}>
        <SectionLabel>Launch</SectionLabel>
        <Grid container spacing={1.5}>
          {defensiveTools.map((tool) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={`${tool.path}-${tool.title}`}>
              <FeatureTile
                title={tool.title}
                description={tool.description}
                icon={tool.icon}
                onClick={() => router.push(tool.path)}
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Box
            sx={{
              height: '100%',
              p: 2.75,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>Recent findings</Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                onClick={() => router.push('/vulnerabilities')}
                sx={{ color: 'text.secondary', fontWeight: 600 }}
              >
                View all
              </Button>
            </Stack>

            {stats.recentVulnerabilities.length === 0 ? (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 280, mx: 'auto' }}>
                  No findings yet. Start with a local scan to populate this feed.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<SecurityIcon />}
                  onClick={() => router.push('/scan-local')}
                  sx={{ borderRadius: 2 }}
                >
                  Scan local machine
                </Button>
              </Box>
            ) : (
              <Stack divider={<Divider sx={{ borderColor: (t) => alpha(t.palette.divider, 0.6) }} />}>
                {stats.recentVulnerabilities.map((vuln) => (
                  <Box
                    key={vuln.id}
                    sx={{
                      py: 1.75,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      cursor: 'pointer',
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => router.push('/vulnerabilities')}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        flexShrink: 0,
                        bgcolor: `${getSeverityColor(vuln.severity)}.main`,
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {vuln.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(vuln.detectedAt)}
                      </Typography>
                    </Box>
                    <Chip
                      label={vuln.severity}
                      size="small"
                      color={getSeverityColor(vuln.severity) as 'error' | 'warning' | 'info'}
                      variant="outlined"
                      sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700, textTransform: 'capitalize' }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Box
            sx={{
              height: '100%',
              p: 2.75,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>Recent scans</Typography>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                onClick={() => router.push('/scan-history')}
                sx={{ color: 'text.secondary', fontWeight: 600 }}
              >
                History
              </Button>
            </Stack>

            {stats.recentScans.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                Scan history appears here after your first run.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {stats.recentScans.map((scan) => (
                  <Box
                    key={scan.scanId}
                    onClick={() => router.push('/scan-history')}
                    sx={{
                      px: 1.75,
                      py: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'border-color 0.2s ease',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {scan.os}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(scan.timestamp)}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        letterSpacing: '-0.03em',
                        color:
                          scan.securityScore >= 70
                            ? 'success.main'
                            : scan.securityScore >= 50
                              ? 'warning.main'
                              : 'error.main',
                      }}
                    >
                      {scan.securityScore}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
