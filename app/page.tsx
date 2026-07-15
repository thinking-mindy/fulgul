"use client";

import Grid from '@mui/material/Grid2';
import {
  Typography,
  Box,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ScanIcon from '@mui/icons-material/Scanner';
import BuildIcon from '@mui/icons-material/Build';
import GavelIcon from '@mui/icons-material/Gavel';
import ShieldIcon from '@mui/icons-material/Shield';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BoltIcon from '@mui/icons-material/Bolt';
import { useRouter } from 'next/navigation';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import WorkflowStrip from '../components/ui/WorkflowStrip';
import FeatureTile from '../components/ui/FeatureTile';
import GlassCard from '../components/ui/GlassCard';
import { useSecurityOverview, formatTimeAgo } from '../hooks/useSecurityOverview';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fixed':
        return 'success';
      case 'failed':
        return 'error';
      case 'in-progress':
        return 'warning';
      default:
        return 'default';
    }
  };

  const fixRate =
    overview.totalVulnerabilities > 0
      ? Math.round((overview.fixedVulnerabilities / overview.totalVulnerabilities) * 100)
      : 0;

  const modules = [
    {
      title: 'Offensive Hub',
      description: 'Run live attack labs and capture flags against targets you control.',
      icon: <GavelIcon />,
      path: '/offensive',
      tag: 'Simulate',
    },
    {
      title: 'Defensive Hub',
      description: 'Scan, triage, and track posture across your environment.',
      icon: <ShieldIcon />,
      path: '/defensive',
      tag: 'Detect',
    },
    {
      title: 'Harden Systems',
      description: 'Apply guided hardening tasks with clear impact and rollback notes.',
      icon: <BuildIcon />,
      path: '/hardening',
      tag: 'Harden',
    },
    {
      title: 'Auto Response',
      description: 'Configure automated patch, quarantine, and notification workflows.',
      icon: <AutoFixHighIcon />,
      path: '/response',
      tag: 'Respond',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => refresh()}>
          {error}
        </Alert>
      )}

      <PageHeader
        eyebrow="Thinking Minds · Security ops"
        title="Simulate sharp."
        titleAccent="Respond secure."
        subtitle="Fulgul unifies offensive labs, vulnerability discovery, and automated response — built for teams who want velocity without trading away security."
        chips={['Simulate', 'Detect', 'Respond', 'Security-first']}
        actions={
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh dashboard">
              <IconButton onClick={refresh} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              size="large"
              startIcon={<ScanIcon />}
              onClick={() => router.push('/scan-local')}
            >
              Run scan
            </Button>
          </Stack>
        }
      />

      <Box sx={{ mb: 4 }}>
        <WorkflowStrip />
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Security score"
            value={overview.averageScore || '—'}
            hint={
              overview.totalScans > 0
                ? `${overview.securityGrade} · ${overview.totalScans} scan${overview.totalScans !== 1 ? 's' : ''}`
                : 'Run your first scan to establish a baseline'
            }
            icon={<BoltIcon />}
            progress={overview.averageScore}
            tone={
              overview.averageScore >= 70
                ? 'success'
                : overview.averageScore >= 50
                  ? 'warning'
                  : overview.averageScore > 0
                    ? 'error'
                    : 'primary'
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Open findings"
            value={overview.totalVulnerabilities}
            hint={
              overview.criticalVulnerabilities > 0
                ? `${overview.criticalVulnerabilities} critical / high`
                : 'No critical issues on record'
            }
            icon={<BugReportIcon />}
            tone={overview.criticalVulnerabilities > 0 ? 'error' : 'primary'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Remediation"
            value={`${fixRate}%`}
            hint={`${overview.fixedVulnerabilities} fixed · ${overview.pendingVulnerabilities} pending`}
            icon={<CheckCircleIcon />}
            progress={fixRate}
            tone="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            label="Needs attention"
            value={overview.pendingVulnerabilities}
            hint="Pending fixes across all scans"
            icon={<WarningIcon />}
            tone={overview.pendingVulnerabilities > 0 ? 'warning' : 'success'}
          />
        </Grid>
      </Grid>

      <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.1em', color: 'text.secondary', mb: 2, display: 'block' }}>
        Security modules
      </Typography>
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {modules.map((mod) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={mod.path}>
            <FeatureTile
              title={mod.title}
              description={mod.description}
              icon={mod.icon}
              tag={mod.tag}
              onClick={() => router.push(mod.path)}
            />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <GlassCard>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                Recent findings
              </Typography>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => router.push('/vulnerabilities')}>
                View all
              </Button>
            </Box>
            {overview.recentVulnerabilities.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No vulnerabilities recorded yet. Start with a local or remote scan.
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
                  <Button variant="contained" startIcon={<ScanIcon />} onClick={() => router.push('/scan-local')}>
                    Scan local
                  </Button>
                  <Button variant="outlined" startIcon={<PlayArrowIcon />} onClick={() => router.push('/offensive')}>
                    Attack lab
                  </Button>
                </Stack>
              </Box>
            ) : (
              <List disablePadding>
                {overview.recentVulnerabilities.slice(0, 5).map((vuln, index) => (
                  <Box key={vuln.id}>
                    <ListItem
                      sx={{
                        px: 0,
                        py: 1.5,
                        borderRadius: 2,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar
                          sx={{
                            bgcolor: `${getSeverityColor(vuln.severity)}.main`,
                            width: 40,
                            height: 40,
                          }}
                        >
                          <BugReportIcon fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {vuln.title}
                            </Typography>
                            <Chip label={vuln.severity} size="small" color={getSeverityColor(vuln.severity) as 'error' | 'warning' | 'info'} sx={{ height: 20, fontSize: '0.65rem' }} />
                            <Chip label={vuln.status} size="small" color={getStatusColor(vuln.status) as 'success' | 'error' | 'warning' | 'default'} sx={{ height: 20, fontSize: '0.65rem' }} />
                          </Box>
                        }
                        secondary={formatTimeAgo(vuln.detectedAt)}
                      />
                    </ListItem>
                    {index < Math.min(overview.recentVulnerabilities.length, 5) - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </GlassCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={2.5}>
            <GlassCard>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 2 }}>
                Studio signal
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="body2" color="text.secondary">
                      Scan coverage
                    </Typography>
                    <Chip
                      label={overview.totalScans > 0 ? 'Active' : 'Idle'}
                      size="small"
                      color={overview.totalScans > 0 ? 'success' : 'default'}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {overview.totalScans} completed scan{overview.totalScans !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Posture grade
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, textTransform: 'capitalize', color: 'primary.main' }}>
                    {overview.securityGrade}
                  </Typography>
                </Box>
                <Divider />
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<GavelIcon />}
                  onClick={() => router.push('/attacks')}
                >
                  Open attack lab
                </Button>
              </Stack>
            </GlassCard>

            <GlassCard>
              <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 2 }}>
                Recent scans
              </Typography>
              {overview.recentScans.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Scan history will appear here after your first run.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {overview.recentScans.slice(0, 4).map((scan) => (
                    <Box
                      key={scan.scanId}
                      onClick={() => router.push('/scan-history')}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease',
                        '&:hover': { borderColor: 'primary.main' },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {scan.os}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(scan.timestamp)}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${scan.securityScore}`}
                          size="small"
                          color={scan.securityScore >= 70 ? 'success' : scan.securityScore >= 50 ? 'warning' : 'error'}
                          sx={{ fontWeight: 700 }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </GlassCard>
          </Stack>
        </Grid>
      </Grid>

      <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Fulgul: The Spark — made with care by{' '}
          <Typography component="span" variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>
            Thinking Minds
          </Typography>
        </Typography>
      </Box>
    </Box>
  );
}
