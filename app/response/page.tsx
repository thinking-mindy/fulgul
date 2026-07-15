"use client";

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
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
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SaveIcon from '@mui/icons-material/Save';
import { invoke } from '@tauri-apps/api/core';
import DefenseWorkspaceBar from '../../components/defense/DefenseWorkspaceBar';
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
        return <CheckCircleIcon />;
      case 'quarantine':
        return <ErrorIcon />;
      case 'notify':
        return <NotificationsIcon />;
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
    <Box>
      <DefenseWorkspaceBar />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
          Automated Response Settings
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={saveSettings}
          disabled={loading}
        >
          Save Settings
        </Button>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Auto-Patch Settings
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoPatch}
                    onChange={(e) =>
                      setSettings({ ...settings, autoPatch: e.target.checked })
                    }
                  />
                }
                label="Enable Auto-Patch"
                sx={{ mb: 2 }}
              />
              {settings.autoPatch && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Patch Delay: {settings.patchDelay} seconds
                  </Typography>
                  <Slider
                    value={settings.patchDelay}
                    onChange={(_, value) =>
                      setSettings({ ...settings, patchDelay: value as number })
                    }
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
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Auto-Quarantine Settings
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoQuarantine}
                    onChange={(e) =>
                      setSettings({ ...settings, autoQuarantine: e.target.checked })
                    }
                  />
                }
                label="Enable Auto-Quarantine"
                sx={{ mb: 2 }}
              />
              {settings.autoQuarantine && (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Quarantine Threshold</InputLabel>
                  <Select
                    value={settings.quarantineThreshold}
                    label="Quarantine Threshold"
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        quarantineThreshold: e.target.value as any,
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
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Auto-Notify Settings
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoNotify}
                    onChange={(e) =>
                      setSettings({ ...settings, autoNotify: e.target.checked })
                    }
                  />
                }
                label="Enable Auto-Notify"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Response Activity Feed
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List>
                {activities.length === 0 ? (
                  <ListItem>
                    <ListItemText
                      primary="No recent activity"
                      primaryTypographyProps={{ color: 'text.secondary' }}
                    />
                  </ListItem>
                ) : (
                  activities.map((activity) => (
                    <ListItem key={activity.id}>
                      <ListItemIcon>{getActionIcon(activity.action)}</ListItemIcon>
                      <ListItemText
                        primary={activity.action.toUpperCase()}
                        secondary={
                          <>
                            <Typography component="span" variant="body2">
                              {activity.target} - {activity.details}
                            </Typography>
                            <br />
                            <Typography component="span" variant="caption" color="text.secondary">
                              {new Date(activity.timestamp).toLocaleString()}
                            </Typography>
                          </>
                        }
                      />
                      <Chip
                        label={activity.status.toUpperCase()}
                        color={getStatusColor(activity.status) as any}
                        size="small"
                      />
                    </ListItem>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

