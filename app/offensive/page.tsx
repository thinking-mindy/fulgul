"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Button,
  Chip,
  Stack,
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
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import RefreshIcon from '@mui/icons-material/Refresh';
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
import SectionLabel, { Panel } from '../../components/ui/SectionLabel';

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
    const interval = setInterval(loadOffensiveData, 10000);
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
      description: 'DNS, WHOIS, TLS, HTTP headers, and banner grabs.',
      icon: <TravelExploreIcon fontSize="small" />,
      path: '/recon',
    },
    {
      title: 'Attack Lab',
      description: 'Live shell steps against authorized lab targets.',
      icon: <SecurityIcon fontSize="small" />,
      path: '/attacks',
    },
    {
      title: 'Credential Lab',
      description: 'WiFi, SSH, and web login testing with wordlists.',
      icon: <WifiPasswordIcon fontSize="small" />,
      path: '/credentials',
    },
    {
      title: 'Engagement Reports',
      description: 'Assemble client reports from logged activity.',
      icon: <AssessmentIcon fontSize="small" />,
      path: '/reports',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={32} thickness={3} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        eyebrow="Offensive"
        title="Attack lab hub"
        subtitle="Authorized live testing against labs you control."
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Refresh">
              <IconButton
                onClick={loadOffensiveData}
                size="small"
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<PlayArrowIcon />}
              onClick={() => router.push('/attacks')}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              Open lab
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={1.5} sx={{ mb: 3.5 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="Scenarios"
            value={stats.totalScenarios}
            hint="Curated attack paths ready to run"
            icon={<SecurityIcon fontSize="small" />}
            tone="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="Flags captured"
            value={stats.totalFlagsCaptured}
            hint={`${stats.completedScenarios} completed session${stats.completedScenarios !== 1 ? 's' : ''}`}
            icon={<FlagIcon fontSize="small" />}
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
            icon={<GavelIcon fontSize="small" />}
            tone={stats.activeSessions > 0 ? 'warning' : 'primary'}
          />
        </Grid>
      </Grid>

      <SectionLabel>Launch</SectionLabel>
      <Grid container spacing={1.5} sx={{ mb: 3.5 }}>
        {offensiveTools.map((tool) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={tool.path}>
            <FeatureTile
              title={tool.title}
              description={tool.description}
              icon={tool.icon}
              onClick={() => router.push(tool.path)}
            />
          </Grid>
        ))}
      </Grid>

      <SectionLabel>Scenarios</SectionLabel>
      {scenarios.length === 0 ? (
        <Alert severity="info" sx={{ mb: 3.5, borderRadius: 2 }}>
          No attack scenarios available. Check back later for new challenges.
        </Alert>
      ) : (
        <Grid container spacing={1.5} sx={{ mb: 3.5 }}>
          {scenarios.map((scenario) => (
            <Grid size={{ xs: 12, md: 6 }} key={scenario.id}>
              <Panel>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.25 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.5 }}>
                      {scenario.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {scenario.difficulty} · {scenario.flags.length} flag
                      {scenario.flags.length !== 1 ? 's' : ''} · ~{scenario.estimatedTime} min ·{' '}
                      {scenario.vulnerabilities.length} vulns
                    </Typography>
                  </Box>
                  <Chip
                    label={scenario.difficulty}
                    size="small"
                    color={getDifficultyColor(scenario.difficulty) as 'success' | 'warning' | 'error' | 'default'}
                    variant="outlined"
                    sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700 }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.55 }}>
                  {scenario.description}
                </Typography>
                {probes[scenario.id] && (
                  <Alert
                    severity={probes[scenario.id].reachable ? 'success' : 'warning'}
                    sx={{ mb: 1.5, py: 0, borderRadius: 2 }}
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
                    onClick={() => void probeScenario(scenario.id)}
                    sx={{ borderRadius: 2 }}
                  >
                    {probingId === scenario.id ? 'Probing…' : 'Probe target'}
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<PlayArrowIcon />}
                    onClick={() => router.push('/attacks')}
                    sx={{ borderRadius: 2 }}
                  >
                    Start
                  </Button>
                </Stack>
              </Panel>
            </Grid>
          ))}
        </Grid>
      )}

      {activeSessions.length > 0 && (
        <>
          <SectionLabel>Active sessions</SectionLabel>
          <Stack spacing={1.5} sx={{ mb: 3.5 }}>
            {activeSessions.map((session) => (
              <Panel key={session.sessionId}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{getScenarioName(session.scenarioId)}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
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
                    sx={{ textTransform: 'capitalize', height: 22, fontWeight: 700 }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Progress: {session.currentStep} / {session.steps.length} steps ·{' '}
                  {session.flagsCaptured?.length || 0} flags · started{' '}
                  {new Date(session.startTime).toLocaleString()}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    session.steps.length > 0 ? (session.currentStep / session.steps.length) * 100 : 0
                  }
                  sx={{ height: 4, borderRadius: 99, mb: 1.5 }}
                />
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => router.push('/attacks')}
                  sx={{ borderRadius: 2 }}
                >
                  Continue session
                </Button>
              </Panel>
            ))}
          </Stack>
        </>
      )}

      <SectionLabel>Principles</SectionLabel>
      <Grid container spacing={1.5} sx={{ mb: 3.5 }}>
        {[
          {
            title: 'Ethical hacking',
            body: 'Use the same tools as adversaries — legally — to find weaknesses first.',
          },
          {
            title: 'Attacker mindset',
            body: 'Understanding offensive paths strengthens how you design defenses.',
          },
          {
            title: 'Hands-on practice',
            body: 'Controlled labs let you rehearse pentest skills without production risk.',
          },
          {
            title: 'Defensive payback',
            body: 'Apply what you learn to detect, contain, and harden faster.',
          },
        ].map((item) => (
          <Grid size={{ xs: 12, sm: 6 }} key={item.title}>
            <Panel>
              <Typography sx={{ fontWeight: 700, mb: 0.75 }}>{item.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                {item.body}
              </Typography>
            </Panel>
          </Grid>
        ))}
      </Grid>

      <SectionLabel>Learning path</SectionLabel>
      <Panel>
        <Stack spacing={1.75}>
          {[
            {
              icon: <RadioButtonUncheckedIcon color="success" fontSize="small" />,
              primary: 'Start with easy scenarios',
              secondary: 'Basic web flaws and weak credentials',
            },
            {
              icon: <RadioButtonUncheckedIcon color="warning" fontSize="small" />,
              primary: 'Progress to medium',
              secondary: 'Network services, SMB shares, and API security',
            },
            {
              icon: <RadioButtonUncheckedIcon color="error" fontSize="small" />,
              primary: 'Master hard paths',
              secondary: 'Advanced exploitation and multi-step chains',
            },
            {
              icon: <EmojiEventsIcon color="primary" fontSize="small" />,
              primary: 'Apply knowledge defensively',
              secondary: 'Detect attacks and harden before they land',
            },
          ].map((step) => (
            <Stack key={step.primary} direction="row" spacing={1.5} alignItems="flex-start">
              <Box sx={{ mt: 0.15 }}>{step.icon}</Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {step.primary}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {step.secondary}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <SchoolIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            Permission first — test only systems you are authorized to assess.
          </Typography>
        </Stack>
      </Panel>

      <Box sx={{ mt: 5, pt: 2.5, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.04em' }}>
          Fulgul · Thinking Minds
        </Typography>
      </Box>
    </Box>
  );
}
