"use client";

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid2,
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
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import SecurityIcon from '@mui/icons-material/Security';
import FilterListIcon from '@mui/icons-material/FilterList';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InfoIcon from '@mui/icons-material/Info';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TimerIcon from '@mui/icons-material/Timer';
import { invoke } from '@tauri-apps/api/core';
import DefenseWorkspaceBar from '../../components/defense/DefenseWorkspaceBar';
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

    // Filter by priority tab
    if (selectedTab !== 'all') {
      filtered = filtered.filter((task) => task.priority === selectedTab);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((task) => task.category === categoryFilter);
    }

    // Filter by search query
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
      // Reload tasks to update status
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
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'in-progress':
        return <CircularProgress size={16} />;
      case 'not-applicable':
        return <InfoIcon color="disabled" />;
      default:
        return <WarningIcon color="warning" />;
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

  const getCategoryIcon = (category: string) => {
    return <SecurityIcon />;
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
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <DefenseWorkspaceBar />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            System Hardening
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Secure your system with comprehensive hardening tasks for {tasks[0]?.platform[0] || 'your OS'}
          </Typography>
        </Box>
        <Button variant="contained" onClick={loadTasks} startIcon={<SecurityIcon />}>
          Refresh Tasks
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid2 container spacing={2} sx={{ mb: 3 }}>
        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Tasks
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {stats.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {stats.completed}
              </Typography>
            </CardContent>
          </Card>
        </Grid2>
        <Grid2 size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Critical
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                {stats.critical}
              </Typography>
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 200 }}
            />
            <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
              <Tab label="All" value="all" />
              <Tab label="Critical" value="critical" />
              <Tab label="High" value="high" />
              <Tab label="Medium" value="medium" />
              <Tab label="Low" value="low" />
            </Tabs>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`Status: ${statusFilter}`}
              onClick={() => {
                const next: StatusFilter[] = ['all', 'pending', 'completed', 'failed'];
                const idx = next.indexOf(statusFilter);
                setStatusFilter(next[(idx + 1) % next.length]);
              }}
              variant={statusFilter !== 'all' ? 'filled' : 'outlined'}
            />
            <Chip
              label={`Category: ${categoryFilter === 'all' ? 'All' : categoryFilter}`}
              onClick={() => {
                const options = ['all', ...categories];
                const idx = options.indexOf(categoryFilter);
                setCategoryFilter(options[(idx + 1) % options.length]);
              }}
              variant={categoryFilter !== 'all' ? 'filled' : 'outlined'}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Grid2 container spacing={3}>
        {filteredTasks.length === 0 ? (
          <Grid2 size={12}>
            <Alert severity="info">No tasks found matching your filters.</Alert>
          </Grid2>
        ) : (
          filteredTasks.map((task) => (
            <Grid2 size={12} key={task.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {task.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {task.description}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        <Chip
                          label={task.category}
                          size="small"
                          variant="outlined"
                          icon={getCategoryIcon(task.category)}
                        />
                        <Chip
                          label={task.priority.toUpperCase()}
                          color={getPriorityColor(task.priority) as any}
                          size="small"
                        />
                        <Chip
                          label={task.status.replace('-', ' ').toUpperCase()}
                          color={getStatusColor(task.status) as any}
                          size="small"
                          icon={getStatusIcon(task.status)}
                        />
                        <Chip
                          label={`Impact: ${task.impact}`}
                          size="small"
                          variant="outlined"
                        />
                        {task.requiresReboot && (
                          <Chip
                            label="Requires Reboot"
                            size="small"
                            color="warning"
                            icon={<RestartAltIcon />}
                          />
                        )}
                        {task.estimatedTime && (
                          <Chip
                            label={task.estimatedTime}
                            size="small"
                            variant="outlined"
                            icon={<TimerIcon />}
                          />
                        )}
                      </Box>
                    </Box>
                    {task.status === 'pending' && task.command && (
                      <Button
                        variant="contained"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => handleApplyTask(task)}
                        disabled={applyingTask === task.id}
                      >
                        Apply Fix
                      </Button>
                    )}
                  </Box>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="body2" color="text.secondary">
                        View Details ({task.suggestions.length} suggestions)
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {task.suggestions.map((suggestion, index) => (
                          <ListItem key={index}>
                            <ListItemText
                              primary={suggestion}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                      {task.manualSteps && task.manualSteps.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Manual Steps:
                          </Typography>
                          <List dense>
                            {task.manualSteps.map((step, index) => (
                              <ListItem key={index}>
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
                </CardContent>
              </Card>
            </Grid2>
          ))
        )}
      </Grid2>

      {/* Terminal Dialog */}
      <Dialog
        open={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' },
        }}
      >
        <DialogTitle>
          Applying: {selectedTask?.name}
        </DialogTitle>
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
