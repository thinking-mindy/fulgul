"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import SecurityIcon from '@mui/icons-material/Security';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoIcon from '@mui/icons-material/Info';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TimerIcon from '@mui/icons-material/Timer';
import RefreshIcon from '@mui/icons-material/Refresh';
import { invoke } from '@tauri-apps/api/core';
import DefenseWorkspaceBar from '../../components/defense/DefenseWorkspaceBar';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import { Panel } from '../../components/ui/SectionLabel';
import type { HardeningTask } from '../../types/tauri';
import Terminal from '../../components/Terminal';

type TabValue = 'all' | 'critical' | 'high' | 'medium' | 'low';
type StatusFilter = 'all' | 'pending' | 'completed' | 'failed';

export default function HardeningPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<HardeningTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<HardeningTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<TabValue>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<HardeningTask | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [applyingTask, setApplyingTask] = useState<string | null>(null);
  const [appliedTasks, setAppliedTasks] = useState<Set<string>>(new Set());

  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await invoke<HardeningTask[]>('get_hardening_tasks');
      setTasks(response);
      setFilteredTasks(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    let filtered = [...tasks];

    if (selectedTab !== 'all') {
      filtered = filtered.filter((task) => task.priority === selectedTab);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((task) => task.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.name.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.category.toLowerCase().includes(query)
      );
    }

    setFilteredTasks(filtered);
  }, [tasks, selectedTab, statusFilter, categoryFilter, searchQuery]);

  const handleApplyTask = async (task: HardeningTask) => {
    if (!task.command) {
      setError('This task requires manual steps. Please follow the suggestions.');
      return;
    }

    setSelectedTask(task);
    setTerminalOpen(true);
    setApplyingTask(task.id);
  };

  const handleTerminalComplete = async (success: boolean) => {
    if (success && selectedTask) {
      setAppliedTasks((prev) => {
        const newSet = new Set(prev);
        newSet.add(selectedTask.id);
        return newSet;
      });
      await loadTasks();
    }
    setTerminalOpen(false);
    setApplyingTask(null);
    setSelectedTask(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'failed':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'in-progress':
        return <CircularProgress size={16} />;
      case 'not-applicable':
        return <InfoIcon color="disabled" fontSize="small" />;
      default:
        return <WarningIcon color="warning" fontSize="small" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'in-progress':
        return 'info';
      case 'not-applicable':
        return 'default';
      default:
        return 'warning';
    }
  };

  const categories = Array.from(new Set(tasks.map((t) => t.category)));

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    critical: tasks.filter((t) => t.priority === 'critical').length,
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={32} thickness={3} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <DefenseWorkspaceBar />
      <PageHeader
        eyebrow="Harden"
        title="System hardening"
        subtitle={`Guided hardening for ${tasks[0]?.platform[0] || 'your OS'}.`}
        actions={
          <Button
            variant="contained"
            onClick={loadTasks}
            startIcon={<RefreshIcon />}
            sx={{ borderRadius: 2 }}
          >
            Refresh
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Total tasks" value={stats.total} icon={<SecurityIcon fontSize="small" />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Pending" value={stats.pending} icon={<WarningIcon fontSize="small" />} tone="warning" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Completed" value={stats.completed} icon={<CheckCircleIcon fontSize="small" />} tone="success" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Critical" value={stats.critical} icon={<ErrorIcon fontSize="small" />} tone="error" />
        </Grid>
      </Grid>

      <Panel sx={{ mb: 3 }}>
        <Stack spacing={2}>
          <TextField
            size="small"
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={selectedTab}
            onChange={(_, v) => v && setSelectedTab(v)}
            sx={{
              flexWrap: 'wrap',
              '& .MuiToggleButton-root': {
                borderRadius: '8px !important',
                px: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'divider',
              },
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="critical">Critical</ToggleButton>
            <ToggleButton value="high">High</ToggleButton>
            <ToggleButton value="medium">Medium</ToggleButton>
            <ToggleButton value="low">Low</ToggleButton>
          </ToggleButtonGroup>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
              Status
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={statusFilter}
              onChange={(_, v) => v && setStatusFilter(v)}
              sx={{
                '& .MuiToggleButton-root': {
                  borderRadius: '8px !important',
                  px: 1.25,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: 'divider',
                  height: 28,
                  fontSize: '0.75rem',
                },
              }}
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="pending">Pending</ToggleButton>
              <ToggleButton value="completed">Done</ToggleButton>
              <ToggleButton value="failed">Failed</ToggleButton>
            </ToggleButtonGroup>
            {categories.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mr: 0.5 }}>
                  Category
                </Typography>
                <Chip
                  label={categoryFilter === 'all' ? 'All' : categoryFilter}
                  size="small"
                  variant={categoryFilter !== 'all' ? 'filled' : 'outlined'}
                  onClick={() => {
                    const options = ['all', ...categories];
                    const idx = options.indexOf(categoryFilter);
                    setCategoryFilter(options[(idx + 1) % options.length]);
                  }}
                  sx={{ height: 28, fontWeight: 600 }}
                />
              </>
            )}
          </Stack>
        </Stack>
      </Panel>

      <Stack spacing={2}>
        {filteredTasks.length === 0 ? (
          <Panel>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No tasks match your filters.
            </Typography>
          </Panel>
        ) : (
          filteredTasks.map((task) => (
            <Panel key={task.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.75 }}>
                    {task.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
                    {task.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {task.category} · {task.priority} · {task.status.replace('-', ' ')} · impact {task.impact}
                    {task.requiresReboot ? ' · reboot required' : ''}
                    {task.estimatedTime ? ` · ${task.estimatedTime}` : ''}
                  </Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
                    <Chip
                      label={task.priority}
                      color={getPriorityColor(task.priority) as 'error' | 'warning' | 'info' | 'default'}
                      size="small"
                      variant="outlined"
                      sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700, textTransform: 'capitalize' }}
                    />
                    <Chip
                      label={task.status.replace('-', ' ')}
                      color={getStatusColor(task.status) as 'success' | 'error' | 'info' | 'warning' | 'default'}
                      size="small"
                      icon={getStatusIcon(task.status)}
                      sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700, textTransform: 'capitalize' }}
                    />
                    {task.requiresReboot && (
                      <Chip
                        label="Reboot"
                        size="small"
                        color="warning"
                        variant="outlined"
                        icon={<RestartAltIcon />}
                        sx={{ height: 22, fontSize: '0.65rem' }}
                      />
                    )}
                    {task.estimatedTime && (
                      <Chip
                        label={task.estimatedTime}
                        size="small"
                        variant="outlined"
                        icon={<TimerIcon />}
                        sx={{ height: 22, fontSize: '0.65rem' }}
                      />
                    )}
                  </Stack>
                </Box>
                {task.status === 'pending' && task.command && (
                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleApplyTask(task)}
                    disabled={applyingTask === task.id}
                    sx={{ borderRadius: 2, flexShrink: 0 }}
                  >
                    Apply
                  </Button>
                )}
              </Box>

              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  bgcolor: 'transparent',
                  '&:before': { display: 'none' },
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px !important',
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" color="text.secondary">
                    Details ({task.suggestions.length} suggestions)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {task.suggestions.map((suggestion, index) => (
                      <ListItem key={index} disablePadding sx={{ py: 0.35 }}>
                        <ListItemText
                          primary={suggestion}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  {task.manualSteps && task.manualSteps.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 700 }}>
                        Manual steps
                      </Typography>
                      <List dense>
                        {task.manualSteps.map((step, index) => (
                          <ListItem key={index} disablePadding sx={{ py: 0.35 }}>
                            <ListItemText
                              primary={`${index + 1}. ${step}`}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            </Panel>
          ))
        )}
      </Stack>

      <Dialog
        open={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { height: '80vh', borderRadius: 2.5 } }}
      >
        <DialogTitle>Applying: {selectedTask?.name}</DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Terminal
              command={selectedTask.command || ''}
              onComplete={handleTerminalComplete}
              onClose={() => setTerminalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
