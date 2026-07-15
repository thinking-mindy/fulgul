"use client";

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  Alert,
  Stack,
  Divider,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Badge,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import FlagIcon from '@mui/icons-material/Flag';
import SecurityIcon from '@mui/icons-material/Security';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { invoke } from '@tauri-apps/api/core';
import type { AttackScenario, AttackSession, AttackStep } from '../../types/tauri';
import PageHeader from '../../components/ui/PageHeader';

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
      // Ensure all fields are initialized
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
      // Ensure all fields are initialized
      const sessionWithDefaults: AttackSession = {
        ...newSession,
        flagsCaptured: newSession.flagsCaptured || [],
        logs: newSession.logs || [],
        steps: newSession.steps || [],
      };
      setSession(sessionWithDefaults);
      // Auto-run recon step once lab probe logs have had time to finish
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
      const output = await invoke<string>('execute_attack_command', {
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
      // Stop the session if it's running
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

  const getCategoryIcon = (category: string) => {
    return <SecurityIcon />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
        {session && (
          <IconButton
            onClick={handleBack}
            sx={{ border: '1px solid', borderColor: 'divider', mt: 0.5 }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }}>
          <PageHeader
            eyebrow="Attack lab"
            title={session ? selectedScenario?.name || 'Live session' : 'Pick your scenario.'}
            titleAccent={session ? undefined : 'Run real commands.'}
            subtitle={
              session
                ? 'Execute shell commands against your lab target. Flags are captured from real output.'
                : 'Choose a scenario, start a session, and work through each step with live tooling on this machine.'
            }
            chips={session ? ['Live shell', 'Authorized targets only'] : ['Web', 'Network', 'API']}
          />
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!session ? (
        <Grid container spacing={3}>
          {scenarios.map((scenario) => (
            <Grid item xs={12} md={6} key={scenario.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-4px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {scenario.name}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        <Chip
                          label={scenario.difficulty}
                          size="small"
                          color={getDifficultyColor(scenario.difficulty) as any}
                        />
                        <Chip label={scenario.category} size="small" variant="outlined" />
                        <Chip label={`Port ${scenario.port}`} size="small" variant="outlined" />
                      </Stack>
                    </Box>
                    {getCategoryIcon(scenario.category)}
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {scenario.description}
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Vulnerabilities:
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                      {scenario.vulnerabilities.slice(0, 3).map((vuln, idx) => (
                        <Chip key={idx} label={vuln} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                      ))}
                      {scenario.vulnerabilities.length > 3 && (
                        <Chip
                          label={`+${scenario.vulnerabilities.length - 3} more`}
                          size="small"
                          sx={{ fontSize: '0.65rem', height: 20 }}
                        />
                      )}
                    </Stack>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Flags to Capture: {scenario.flags.length}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      {scenario.flags.map((flag) => (
                        <Chip
                          key={flag.id}
                          icon={<FlagIcon />}
                          label={flag.name}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Est. Time: {scenario.estimatedTime} min
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => startAttack(scenario)}
                      size="small"
                    >
                      Start Attack
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {selectedScenario?.name}
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={stopAttack}
                    size="small"
                  >
                    Stop Attack
                  </Button>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Status: {session.status.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Score: {session.score} points
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Flags Captured: {(session.flagsCaptured || []).length} / {selectedScenario?.flags.length || 0}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Attack Steps
                </Typography>
                <Stack spacing={2}>
                  {session.steps.map((step, idx) => (
                    <Paper
                      key={step.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: step.completed ? 'success.dark' : 'background.default',
                        borderColor: step.completed ? 'success.main' : 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'start', gap: 2 }}>
                        <Box sx={{ mt: 0.5 }}>
                          {step.completed ? (
                            <CheckCircleIcon color="success" />
                          ) : (
                            <RadioButtonUncheckedIcon color="disabled" />
                          )}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {idx + 1}. {step.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            {step.description}
                          </Typography>
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1,
                              bgcolor: 'background.paper',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              mb: 1,
                            }}
                          >
                            {step.command}
                          </Paper>
                          {step.output && (
                            <Paper
                              variant="outlined"
                              sx={{
                                p: 1,
                                bgcolor: 'info.dark',
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                color: 'info.contrastText',
                              }}
                            >
                              {step.output}
                            </Paper>
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
                                runningStepId !== null ||
                                executing ||
                                session.status !== 'running'
                              }
                              sx={{ mt: 1 }}
                            >
                              {runningStepId === step.id ? 'Running…' : 'Run step'}
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Command Execution
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
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
                  >
                    {executing ? <CircularProgress size={20} /> : <SendIcon />}
                  </IconButton>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Commands run as real shell processes on this machine (for example curl, nc, smbclient). Only use
                  against systems and labs you are authorized to test.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Flags Captured
                </Typography>
                {(!session.flagsCaptured || session.flagsCaptured.length === 0) ? (
                  <Typography variant="body2" color="text.secondary">
                    No flags captured yet. Complete attack steps to capture flags!
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {session.flagsCaptured.map((flag, idx) => (
                      <Chip
                        key={idx}
                        icon={<FlagIcon />}
                        label={flag}
                        color="success"
                        sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                      />
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Attack Logs
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    bgcolor: 'background.default',
                    maxHeight: 500,
                    overflow: 'auto',
                    p: 1,
                  }}
                >
                  <List dense>
                    {session.logs.length === 0 ? (
                      <ListItem>
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
                        <ListItem key={index} sx={{ py: 0.5 }}>
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
                </Paper>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
