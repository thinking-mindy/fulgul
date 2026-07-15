"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Alert,
  Stack,
  Divider,
  TextField,
  IconButton,
  CircularProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import FlagIcon from '@mui/icons-material/Flag';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { invoke } from '@tauri-apps/api/core';
import type { AttackScenario, AttackSession, AttackStep } from '../../types/tauri';
import PageHeader from '../../components/ui/PageHeader';
import SectionLabel, { Panel } from '../../components/ui/SectionLabel';

export default function AttacksPage() {
  const [scenarios, setScenarios] = useState<AttackScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<AttackScenario | null>(null);
  const [session, setSession] = useState<AttackSession | null>(null);
  const [command, setCommand] = useState('');
  const [executing, setExecuting] = useState(false);
  const [runningStepId, setRunningStepId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadScenarios();
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  useEffect(() => {
    if (session && session.status === 'running') {
      const interval = setInterval(() => {
        refreshSession();
      }, 1000);
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    }
  }, [session?.sessionId]);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const data = await invoke<AttackScenario[]>('get_attack_scenarios');
      setScenarios(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async (sessionIdOverride?: string) => {
    const sid = sessionIdOverride ?? session?.sessionId;
    if (!sid) return;
    try {
      const updated = await invoke<AttackSession>('get_attack_session', {
        sessionId: sid,
      });
      const sessionWithDefaults: AttackSession = {
        ...updated,
        flagsCaptured: updated.flagsCaptured || [],
        logs: updated.logs || [],
        steps: updated.steps || [],
      };
      setSession(sessionWithDefaults);
    } catch (err) {
      console.error('Failed to refresh session:', err);
    }
  };

  const startAttack = async (scenario: AttackScenario) => {
    setError(null);
    setSelectedScenario(scenario);
    try {
      const newSession = await invoke<AttackSession>('start_attack_session', {
        scenarioId: scenario.id,
      });
      const sessionWithDefaults: AttackSession = {
        ...newSession,
        flagsCaptured: newSession.flagsCaptured || [],
        logs: newSession.logs || [],
        steps: newSession.steps || [],
      };
      setSession(sessionWithDefaults);
      setTimeout(() => {
        void runStep('step-1', sessionWithDefaults.sessionId);
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start attack');
    }
  };

  const stopAttack = async () => {
    if (!session) return;
    try {
      await invoke('stop_attack_session', { sessionId: session.sessionId });
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop attack');
    }
  };

  const executeCommand = async () => {
    if (!session || !command.trim()) return;
    setExecuting(true);
    try {
      await invoke<string>('execute_attack_command', {
        sessionId: session.sessionId,
        command: command.trim(),
      });
      setCommand('');
      await refreshSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute command');
    } finally {
      setExecuting(false);
    }
  };

  const runStep = async (stepId: string, sessionIdOverride?: string) => {
    const sid = sessionIdOverride ?? session?.sessionId;
    if (!sid) return;
    setRunningStepId(stepId);
    setError(null);
    try {
      await invoke<AttackStep>('run_attack_step', {
        sessionId: sid,
        stepId,
      });
      await refreshSession(sid);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to run step';
      if (!msg.includes('already completed')) {
        setError(msg);
      }
    } finally {
      setRunningStepId(null);
    }
  };

  const handleBack = () => {
    if (session) {
      if (session.status === 'running') {
        stopAttack();
      }
    }
    setSession(null);
    setSelectedScenario(null);
    setCommand('');
    setError(null);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'success';
      case 'Medium':
        return 'warning';
      case 'Hard':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress size={32} thickness={3} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        {session && (
          <IconButton
            onClick={handleBack}
            size="small"
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mt: 1 }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <PageHeader
            eyebrow="Attack lab"
            title={session ? selectedScenario?.name || 'Live session' : 'Attack scenarios'}
            subtitle={
              session
                ? 'Shell commands against your lab target. Flags capture from real output.'
                : 'Pick a scenario and work each step with live tooling on this machine.'
            }
            actions={
              session ? (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={stopAttack}
                  size="small"
                  sx={{ borderRadius: 2 }}
                >
                  Stop
                </Button>
              ) : undefined
            }
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!session ? (
        <>
          <SectionLabel>Scenarios</SectionLabel>
          <Grid container spacing={1.5}>
            {scenarios.map((scenario) => (
              <Grid size={{ xs: 12, md: 6 }} key={scenario.id}>
                <Panel>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.5 }}>
                        {scenario.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {scenario.category} · Port {scenario.port} · {scenario.flags.length} flags · ~
                        {scenario.estimatedTime} min
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

                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    {scenario.vulnerabilities.slice(0, 3).join(' · ')}
                    {scenario.vulnerabilities.length > 3
                      ? ` · +${scenario.vulnerabilities.length - 3} more`
                      : ''}
                  </Typography>

                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => startAttack(scenario)}
                    size="small"
                    sx={{ borderRadius: 2 }}
                  >
                    Start attack
                  </Button>
                </Panel>
              </Grid>
            ))}
          </Grid>
        </>
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 8 }}>
            <SectionLabel>Session</SectionLabel>
            <Panel sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                Status: {session.status.toUpperCase()} · Score: {session.score} · Flags:{' '}
                {(session.flagsCaptured || []).length} / {selectedScenario?.flags.length || 0}
              </Typography>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: '0.12em', color: 'text.secondary', display: 'block', mb: 1.5 }}>
                Attack steps
              </Typography>
              <Stack spacing={1.5}>
                {session.steps.map((step, idx) => (
                  <Box
                    key={step.id}
                    sx={{
                      p: 1.75,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: step.completed ? 'success.main' : 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Box sx={{ mt: 0.25 }}>
                        {step.completed ? (
                          <CheckCircleIcon color="success" fontSize="small" />
                        ) : (
                          <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                        )}
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.35 }}>
                          {idx + 1}. {step.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                          {step.description}
                        </Typography>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            mb: step.output || !step.completed ? 1 : 0,
                            overflow: 'auto',
                          }}
                        >
                          {step.command}
                        </Box>
                        {step.output && (
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: 1.5,
                              bgcolor: 'action.hover',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              mb: !step.completed ? 1 : 0,
                              maxHeight: 160,
                              overflow: 'auto',
                            }}
                          >
                            {step.output}
                          </Box>
                        )}
                        {!step.completed && (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={
                              runningStepId === step.id ? (
                                <CircularProgress size={14} color="inherit" />
                              ) : (
                                <PlayArrowIcon />
                              )
                            }
                            onClick={() => runStep(step.id)}
                            disabled={
                              runningStepId !== null || executing || session.status !== 'running'
                            }
                            sx={{ borderRadius: 2 }}
                          >
                            {runningStepId === step.id ? 'Running…' : 'Run step'}
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Panel>

            <SectionLabel>Command shell</SectionLabel>
            <Panel>
              <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter attack command (e.g., curl http://localhost:8081/login)"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !executing) {
                      executeCommand();
                    }
                  }}
                  disabled={executing || session.status !== 'running'}
                />
                <IconButton
                  color="primary"
                  onClick={executeCommand}
                  disabled={executing || !command.trim() || session.status !== 'running'}
                  size="small"
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                >
                  {executing ? <CircularProgress size={18} /> : <SendIcon fontSize="small" />}
                </IconButton>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Commands run as real shell processes on this machine. Only use against systems you are
                authorized to test.
              </Typography>
            </Panel>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <SectionLabel>Flags</SectionLabel>
            <Panel sx={{ mb: 2 }}>
              {!session.flagsCaptured || session.flagsCaptured.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No flags yet. Complete steps to capture them.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {session.flagsCaptured.map((flag, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <FlagIcon color="success" fontSize="small" />
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {flag}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
              {selectedScenario && (
                <Box sx={{ mt: 1.5 }}>
                  <LinearProgress
                    variant="determinate"
                    value={
                      selectedScenario.flags.length > 0
                        ? ((session.flagsCaptured || []).length / selectedScenario.flags.length) * 100
                        : 0
                    }
                    sx={{ height: 4, borderRadius: 99 }}
                  />
                </Box>
              )}
            </Panel>

            <SectionLabel>Logs</SectionLabel>
            <Panel sx={{ p: 1.5 }}>
              <Box
                sx={{
                  maxHeight: 500,
                  overflow: 'auto',
                }}
              >
                <List dense disablePadding>
                  {session.logs.length === 0 ? (
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary="No logs yet"
                        primaryTypographyProps={{
                          variant: 'caption',
                          color: 'text.secondary',
                        }}
                      />
                    </ListItem>
                  ) : (
                    session.logs.map((log, index) => (
                      <ListItem key={index} sx={{ py: 0.4, px: 0 }}>
                        <ListItemText
                          primary={log}
                          primaryTypographyProps={{
                            variant: 'caption',
                            fontFamily: 'monospace',
                            sx: {
                              color: log.includes('✓') ? 'success.main' : 'text.primary',
                              fontWeight: log.includes('Flag') ? 600 : 400,
                            },
                          }}
                        />
                      </ListItem>
                    ))
                  )}
                </List>
              </Box>
            </Panel>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
