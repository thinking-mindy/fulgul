'use client';

import Grid from '@mui/material/Grid2';
import {
  Typography,
  Box,
  Button,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ScanIcon from '@mui/icons-material/Scanner';
import BuildIcon from '@mui/icons-material/Build';
import GavelIcon from '@mui/icons-material/Gavel';
import ShieldIcon from '@mui/icons-material/Shield';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { useRouter } from 'next/navigation';
import SecurityScoreGauge from '../components/SecurityScoreGauge';
import { useSecurityOverview, formatTimeAgo } from '../hooks/useSecurityOverview';

const fadeUp = {
  '@keyframes fadeUp': {
    from: { opacity: 0, transform: 'translateY(10px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
};

function sectionAnim(delay: number) {
  return {
    ...fadeUp,
    animation: `fadeUp 0.55s ease ${delay}s both`,
  };
}

export default function Dashboard() {
  const router = useRouter();
  const { overview, loading, error, refresh } = useSecurityOverview(30000);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  };

  const fixRate =
    overview.totalVulnerabilities > 0
      ? Math.round((overview.fixedVulnerabilities / overview.totalVulnerabilities) * 100)
      : 0;

  const modules = [
    {
      title: 'Offensive Hub',
      description: 'Attack labs and flag capture on authorized targets.',
      icon: <GavelIcon fontSize="small" />,
      path: '/offensive',
    },
    {
      title: 'Defensive Hub',
      description: 'Scan, triage, and track security posture.',
      icon: <ShieldIcon fontSize="small" />,
      path: '/defensive',
    },
    {
      title: 'Harden Systems',
      description: 'Guided hardening with clear impact notes.',
      icon: <BuildIcon fontSize="small" />,
      path: '/hardening',
    },
    {
      title: 'Auto Response',
      description: 'Patch, quarantine, and notification rules.',
      icon: <AutoFixHighIcon fontSize="small" />,
      path: '/response',
    },
  ];

  const vitals = [
    {
      label: 'Open findings',
      value: overview.totalVulnerabilities,
      detail:
        overview.criticalVulnerabilities > 0
          ? `${overview.criticalVulnerabilities} critical / high`
          : 'No critical issues',
      icon: <BugReportIcon fontSize="small" />,
      tone: overview.criticalVulnerabilities > 0 ? 'error.main' : 'text.primary',
    },
    {
      label: 'Remediation',
      value: `${fixRate}%`,
      detail: `${overview.fixedVulnerabilities} fixed · ${overview.pendingVulnerabilities} pending`,
      icon: <CheckCircleIcon fontSize="small" />,
      tone: 'success.main',
    },
    {
      label: 'Needs attention',
      value: overview.pendingVulnerabilities,
      detail: 'Pending fixes across scans',
      icon: <WarningIcon fontSize="small" />,
      tone: overview.pendingVulnerabilities > 0 ? 'warning.main' : 'success.main',
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
      {error && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }} onClose={() => refresh()}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'flex-end' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 4,
          ...sectionAnim(0),
        }}
      >
        <Box>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.14em', display: 'block', mb: 1 }}
          >
            Mission control
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.85rem', md: '2.35rem' },
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              mb: 1,
            }}
          >
            Security posture
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 440, lineHeight: 1.65 }}>
            Scan, harden, and respond from one calm workspace.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh">
            <IconButton
              onClick={refresh}
              size="small"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<ScanIcon />}
            onClick={() => router.push('/scan-local')}
            sx={{ px: 2.5, py: 1, borderRadius: 2, fontWeight: 700 }}
          >
            Run scan
          </Button>
        </Stack>
      </Box>

      {/* Posture hero */}
      <Box
        sx={{
          mb: 4,
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          ...sectionAnim(0.06),
        }}
      >
        <Grid container spacing={{ xs: 3, md: 4 }} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <SecurityScoreGauge
                score={overview.averageScore || 0}
                grade={overview.totalScans > 0 ? overview.securityGrade : undefined}
                compact
              />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
              {overview.totalScans > 0
                ? `${overview.totalScans} scan${overview.totalScans !== 1 ? 's' : ''} on record`
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

      {/* Launch */}
      <Box sx={{ mb: 4, ...sectionAnim(0.12) }}>
        <Typography
          variant="overline"
          sx={{ fontWeight: 700, letterSpacing: '0.12em', color: 'text.secondary', mb: 1.5, display: 'block' }}
        >
          Launch
        </Typography>
        <Grid container spacing={1.5}>
          {modules.map((mod) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={mod.path}>
              <Box
                onClick={() => router.push(mod.path)}
                sx={{
                  p: 2.25,
                  height: '100%',
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-2px)',
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                    '& .launch-arrow': { opacity: 1, transform: 'translate(2px, -2px)' },
                  },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    }}
                  >
                    {mod.icon}
                  </Box>
                  <NorthEastIcon
                    className="launch-arrow"
                    sx={{
                      fontSize: 16,
                      color: 'text.secondary',
                      opacity: 0.35,
                      transition: 'opacity 0.2s ease, transform 0.2s ease',
                    }}
                  />
                </Stack>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em', mb: 0.5 }}>
                  {mod.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55, display: 'block' }}>
                  {mod.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Activity */}
      <Grid container spacing={2.5} sx={sectionAnim(0.18)}>
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

            {overview.recentVulnerabilities.length === 0 ? (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 280, mx: 'auto' }}>
                  No findings yet. Start with a local scan to populate this feed.
                </Typography>
                <Button variant="outlined" startIcon={<ScanIcon />} onClick={() => router.push('/scan-local')} sx={{ borderRadius: 2 }}>
                  Scan local machine
                </Button>
              </Box>
            ) : (
              <Stack divider={<Divider sx={{ borderColor: (t) => alpha(t.palette.divider, 0.6) }} />}>
                {overview.recentVulnerabilities.slice(0, 5).map((vuln) => (
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

            {overview.recentScans.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                Scan history appears here after your first run.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {overview.recentScans.slice(0, 5).map((scan) => (
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

      <Box sx={{ mt: 5, pt: 2.5, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.04em' }}>
          Fulgul · Thinking Minds
        </Typography>
      </Box>
    </Box>
  );
}
