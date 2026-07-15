"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import SecurityIcon from '@mui/icons-material/Security';
import FlagIcon from '@mui/icons-material/Flag';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SchoolIcon from '@mui/icons-material/School';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WifiPasswordIcon from '@mui/icons-material/WifiPassword';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useRouter } from 'next/navigation';
import { invoke } from '@tauri-apps/api/core';
import type { AttackScenario, AttackSession, ScenarioProbeResult } from '../../types/tauri';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import FeatureTile from '../../components/ui/FeatureTile';
import GlassCard from '../../components/ui/GlassCard';

export default function OffensiveSecurityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<AttackScenario[]>([]);
  const [activeSessions, setActiveSessions] = useState<AttackSession[]>([]);
  const [probes, setProbes] = useState<Record<string, ScenarioProbeResult>>({});
  const [probingId, setProbingId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalScenarios: 0,
    completedScenarios: 0,
    activeSessions: 0,
    totalFlagsCaptured: 0,
    averageCompletionTime: 0,
  });

  useEffect(() => {
    loadOffensiveData();
    const interval = setInterval(loadOffensiveData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadOffensiveData = async () => {
    setLoading(true);
    try {
      const availableScenarios = await invoke<AttackScenario[]>('get_attack_scenarios');
      const allSessions = await invoke<AttackSession[]>('get_attack_sessions');

      const active = allSessions.filter(
        (s) => s.status === 'running' || s.status === 'starting' || s.status === 'paused',
      );
      const completedList = allSessions.filter((s) => s.status === 'completed');
      const totalFlagsCaptured = allSessions.reduce(
        (sum, s) => sum + (s.flagsCaptured?.length || 0),
        0,
      );

      let averageCompletionTime = 0;
      if (completedList.length > 0) {
        const totalMs = completedList.reduce((sum, s) => {
          const start = new Date(s.startTime).getTime();
          const end = s.endTime ? new Date(s.endTime).getTime() : start;
          return sum + Math.max(0, end - start);
        }, 0);
        averageCompletionTime = Math.round(totalMs / completedList.length / 60000);
      }

      setScenarios(availableScenarios);
      setActiveSessions(active);
      setStats({
        totalScenarios: availableScenarios.length,
        completedScenarios: completedList.length,
        activeSessions: active.length,
        totalFlagsCaptured,
        averageCompletionTime,
      });
    } catch (err) {
      console.error('Failed to load offensive data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'success';
      case 'medium':
        return 'warning';
      case 'hard':
        return 'error';
      default:
        return 'default';
    }
  };

  const getScenarioName = (scenarioId: string) =>
    scenarios.find((s) => s.id === scenarioId)?.name ?? scenarioId;

  const probeScenario = async (scenarioId: string) => {
    setProbingId(scenarioId);
    try {
      const result = await invoke<ScenarioProbeResult>('probe_scenario_target', { scenarioId });
      setProbes((prev) => ({ ...prev, [scenarioId]: result }));
    } catch (err) {
      console.error('Probe failed:', err);
    } finally {
      setProbingId(null);
    }
  };

  const offensiveTools = [
    {
      title: 'Recon Hub',
      description: 'DNS, WHOIS, TLS certs, HTTP security headers, and banner grabs — logged for reports',
      icon: <TravelExploreIcon />,
      path: '/recon',
      color: 'info',
    },
    {
      title: 'Attack Lab',
      description: 'Run real shell commands on this machine against your local vulnerable lab targets',
      icon: <SecurityIcon />,
      path: '/attacks',
      color: 'error',
    },
    {
      title: 'Credential Lab',
      description: 'WiFi, SSH, and web login testing with wordlists, user enum, and stop controls',
      icon: <WifiPasswordIcon />,
      path: '/credentials',
      color: 'warning',
    },
    {
      title: 'Engagement Reports',
      description: 'Build client reports from every scan, brute, recon run — toggle what to show or hide',
      icon: <AssessmentIcon />,
      path: '/reports',
      color: 'success',
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
        eyebrow="Offensive · Live lab"
        title="Think like an attacker."
        titleAccent="Ship safer defenses."
        subtitle="Plan and run live tests from this host against labs you control — Docker, VMs, or local services. Permission first, always."
        chips={['Live shell', 'Authorized labs', 'Flag capture']}
        actions={
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <IconButton onClick={loadOffensiveData} color="primary">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={() => router.push('/attacks')}>
              Open attack lab
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="Scenarios"
            value={stats.totalScenarios}
            hint="Curated attack paths ready to run"
            icon={<SecurityIcon />}
            tone="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="Flags captured"
            value={stats.totalFlagsCaptured}
            hint={`${stats.completedScenarios} completed session${stats.completedScenarios !== 1 ? 's' : ''}`}
            icon={<FlagIcon />}
            tone="success"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="Active sessions"
            value={stats.activeSessions}
            hint={
              stats.averageCompletionTime > 0
                ? `~${stats.averageCompletionTime} min avg completion`
                : 'No completed runs yet'
            }
            icon={<GavelIcon />}
            tone={stats.activeSessions > 0 ? 'warning' : 'primary'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {offensiveTools.map((tool) => (
          <Grid size={{ xs: 12, md: 6 }} key={tool.path}>
            <FeatureTile
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              tag="Lab"
              onClick={() => router.push(tool.path)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Available Scenarios */}
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Available Attack Scenarios
      </Typography>
      {scenarios.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          No attack scenarios available. Check back later for new challenges.
        </Alert>
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {scenarios.map((scenario) => (
            <Grid size={{ xs: 12, md: 6 }} key={scenario.id}>
              <Card
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
                onClick={() => router.push('/attacks')}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {scenario.name}
                      </Typography>
                      <Chip
                        label={scenario.difficulty}
                        size="small"
                        color={getDifficultyColor(scenario.difficulty) as any}
                        sx={{ mb: 1 }}
                      />
                    </Box>
                    <FlagIcon sx={{ color: 'warning.main', fontSize: 32 }} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {scenario.description}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      label={`${scenario.flags.length} Flag${scenario.flags.length !== 1 ? 's' : ''}`}
                      size="small"
                      icon={<FlagIcon />}
                    />
                    <Chip
                      label={`~${scenario.estimatedTime} min`}
                      size="small"
                    />
                    <Chip
                      label={`${scenario.vulnerabilities.length} Vuln${scenario.vulnerabilities.length !== 1 ? 's' : ''}`}
                      size="small"
                    />
                  </Stack>
                  {probes[scenario.id] && (
                    <Alert
                      severity={probes[scenario.id].reachable ? 'success' : 'warning'}
                      sx={{ mb: 1.5, py: 0 }}
                    >
                      {probes[scenario.id].message}
                      {probes[scenario.id].findings.length > 0 && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                          {probes[scenario.id].findings[0]}
                        </Typography>
                      )}
                    </Alert>
                  )}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      fullWidth
                      disabled={probingId === scenario.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void probeScenario(scenario.id);
                      }}
                    >
                      {probingId === scenario.id ? 'Probing…' : 'Probe target'}
                    </Button>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<PlayArrowIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push('/attacks');
                      }}
                    >
                      Start
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            Active Attack Sessions
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {activeSessions.map((session) => (
              <Grid size={{ xs: 12 }} key={session.sessionId}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {getScenarioName(session.scenarioId)}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: 'monospace', display: 'block', mt: 0.25 }}
                        >
                          {session.scenarioId}
                        </Typography>
                      </Box>
                      <Chip
                        label={session.status}
                        color={
                          session.status === 'running'
                            ? 'success'
                            : session.status === 'paused'
                              ? 'warning'
                              : 'info'
                        }
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Progress: {session.currentStep} / {session.steps.length} steps
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={
                          session.steps.length > 0
                            ? (session.currentStep / session.steps.length) * 100
                            : 0
                        }
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`${session.flagsCaptured?.length || 0} Flags Captured`}
                        size="small"
                        icon={<FlagIcon />}
                        color="success"
                      />
                      <Chip
                        label={`Started ${new Date(session.startTime).toLocaleString()}`}
                        size="small"
                      />
                    </Box>
                    <Button
                      variant="outlined"
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={() => router.push('/attacks')}
                    >
                      Continue Session
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Offensive Security Principles */}
      <Card sx={{ mt: 4, bgcolor: 'background.default' }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            ⚔️ Offensive Security Principles
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  🎯 Ethical Hacking
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  White-hat hackers use the same tools and knowledge as black-hats to test defenses legally, finding weaknesses before malicious actors do.
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  🧠 Think Like an Attacker
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Understanding how attackers think and operate helps you build better defenses. Practice offensive techniques to improve your defensive skills.
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  🎓 Hands-On Learning
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Safe, controlled environments allow you to practice penetration testing, exploit development, and security testing without risk.
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  🔄 "Hacking Back" (Defensive)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Using offensive skills to counter active attacks, track attackers, and deploy countermeasures—not just patching vulnerabilities.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Learning Resources */}
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon />
            Learning Path
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <RadioButtonUncheckedIcon color="success" />
              </ListItemIcon>
              <ListItemText
                primary="Start with Easy Scenarios"
                secondary="Begin with basic web application vulnerabilities and weak credentials"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <RadioButtonUncheckedIcon color="warning" />
              </ListItemIcon>
              <ListItemText
                primary="Progress to Medium Difficulty"
                secondary="Learn about network services, SMB shares, and API security"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <RadioButtonUncheckedIcon color="error" />
              </ListItemIcon>
              <ListItemText
                primary="Master Hard Scenarios"
                secondary="Advanced exploitation techniques and multi-step attack chains"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <EmojiEventsIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Apply Knowledge Defensively"
                secondary="Use what you've learned to build stronger defenses and detect attacks"
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Footer */}
      <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Made with ❤️ by <Typography component="span" sx={{ fontWeight: 600 }}>Thinking Minds</Typography>
        </Typography>
      </Box>
    </Box>
  );
}

