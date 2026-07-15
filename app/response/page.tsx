"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SaveIcon from '@mui/icons-material/Save';
import { invoke } from '@tauri-apps/api/core';
import DefenseWorkspaceBar from '../../components/defense/DefenseWorkspaceBar';
import PageHeader from '../../components/ui/PageHeader';
import SectionLabel, { Panel } from '../../components/ui/SectionLabel';
import type { AutoResponseSettings, ResponseActivity } from '../../types/tauri';

export default function ResponsePage() {
  const [settings, setSettings] = useState<AutoResponseSettings>({
    autoPatch: false,
    autoQuarantine: false,
    autoNotify: false,
    patchDelay: 60,
    quarantineThreshold: 'high',
  });
  const [activities, setActivities] = useState<ResponseActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
    loadActivities();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await invoke<AutoResponseSettings>('get_auto_response_settings');
      setSettings(response);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await invoke<ResponseActivity[]>('get_response_activities');
      setActivities(response);
    } catch (err) {
      console.error('Failed to load activities:', err);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setSaved(false);
    try {
      await invoke('update_auto_response_settings', { settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'patch':
        return <CheckCircleIcon fontSize="small" />;
      case 'quarantine':
        return <ErrorIcon fontSize="small" />;
      case 'notify':
        return <NotificationsIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <DefenseWorkspaceBar />
      <PageHeader
        eyebrow="Respond"
        title="Auto response"
        subtitle="Patch, quarantine, and notify when scans find issues."
        actions={
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={saveSettings}
            disabled={loading}
            sx={{ borderRadius: 2 }}
          >
            Save settings
          </Button>
        }
      />

      {saved && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
          Settings saved.
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Panel>
            <SectionLabel>Auto-patch</SectionLabel>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoPatch}
                  onChange={(e) => setSettings({ ...settings, autoPatch: e.target.checked })}
                />
              }
              label="Enable auto-patch"
              sx={{ mb: 1 }}
            />
            {settings.autoPatch && (
              <Box sx={{ mt: 2, px: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Patch delay: {settings.patchDelay}s
                </Typography>
                <Slider
                  value={settings.patchDelay}
                  onChange={(_, value) => setSettings({ ...settings, patchDelay: value as number })}
                  min={0}
                  max={300}
                  step={10}
                  marks={[
                    { value: 0, label: '0s' },
                    { value: 150, label: '150s' },
                    { value: 300, label: '300s' },
                  ]}
                />
              </Box>
            )}
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Panel>
            <SectionLabel>Auto-quarantine</SectionLabel>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoQuarantine}
                  onChange={(e) => setSettings({ ...settings, autoQuarantine: e.target.checked })}
                />
              }
              label="Enable auto-quarantine"
              sx={{ mb: 1 }}
            />
            {settings.autoQuarantine && (
              <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                <InputLabel>Quarantine threshold</InputLabel>
                <Select
                  value={settings.quarantineThreshold}
                  label="Quarantine threshold"
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      quarantineThreshold: e.target.value as AutoResponseSettings['quarantineThreshold'],
                    })
                  }
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            )}
          </Panel>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Panel>
            <SectionLabel>Auto-notify</SectionLabel>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoNotify}
                  onChange={(e) => setSettings({ ...settings, autoNotify: e.target.checked })}
                />
              }
              label="Enable auto-notify"
            />
          </Panel>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Panel>
            <SectionLabel>Activity feed</SectionLabel>
            {activities.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                No recent activity.
              </Typography>
            ) : (
              <List disablePadding>
                {activities.map((activity, index) => (
                  <Box key={activity.id}>
                    {index > 0 && <Divider sx={{ my: 0.5 }} />}
                    <ListItem sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>{getActionIcon(activity.action)}</ListItemIcon>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                              {activity.action}
                            </Typography>
                            <Chip
                              label={activity.status}
                              color={getStatusColor(activity.status) as 'success' | 'error' | 'warning'}
                              size="small"
                              variant="outlined"
                              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, textTransform: 'capitalize' }}
                            />
                          </Stack>
                        }
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.secondary">
                              {activity.target} — {activity.details}
                            </Typography>
                            <br />
                            <Typography component="span" variant="caption" color="text.secondary">
                              {new Date(activity.timestamp).toLocaleString()}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  </Box>
                ))}
              </List>
            )}
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}
