"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  TextField,
  Button,
  Stack,
  Alert,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  alpha,
} from '@mui/material';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import SectionLabel, { Panel } from '../../components/ui/SectionLabel';
import WorkspaceBar from '../../components/pentest/WorkspaceBar';
import type { ReconResult, PentestWorkspace } from '../../types/tauri';

const TOOLS = [
  { id: 'port_sweep', label: 'Port sweep', desc: '26 common ports', field: 'host', placeholder: '192.168.1.1', cmd: 'run_enum_port_sweep' },
  { id: 'subdomains', label: 'Subdomains', desc: 'DNS brute common names', field: 'domain', placeholder: 'example.com', cmd: 'run_enum_subdomains' },
  { id: 'web_paths', label: 'Web paths', desc: 'Discover exposed paths', field: 'url', placeholder: 'https://target.lab', cmd: 'run_enum_web_paths' },
  { id: 'banner', label: 'Service banner', desc: 'Grab service fingerprint', field: 'host', placeholder: 'host', port: true, cmd: 'run_enum_service_banner' },
] as const;

export default function EnumeratePage() {
  const [active, setActive] = useState(0);
  const [target, setTarget] = useState('');
  const [port, setPort] = useState('80');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<PentestWorkspace>('get_pentest_workspace')
      .then((ws) => {
        if (ws.primaryTarget && !target) setTarget(ws.primaryTarget);
      })
      .catch(() => {});
  }, [target]);

  const tool = TOOLS[active];

  const run = async () => {
    if (!target.trim()) {
      setError('Enter a target');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let res: ReconResult;
      if (tool.cmd === 'run_enum_port_sweep') res = await invoke('run_enum_port_sweep', { host: target.trim() });
      else if (tool.cmd === 'run_enum_subdomains') res = await invoke('run_enum_subdomains', { domain: target.trim() });
      else if (tool.cmd === 'run_enum_web_paths') res = await invoke('run_enum_web_paths', { url: target.trim() });
      else res = await invoke('run_enum_service_banner', { host: target.trim(), port: parseInt(port, 10) || 80 });
      setResult(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        eyebrow="Phase 3 · Enumeration"
        title="Attack surface"
        subtitle="Port sweeps, subdomains, and web paths — results feed the workspace."
      />
      <WorkspaceBar />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionLabel>Tools</SectionLabel>
          <Panel>
            <Stack spacing={1}>
              {TOOLS.map((t, i) => {
                const selected = active === i;
                return (
                  <Box
                    key={t.id}
                    onClick={() => {
                      setActive(i);
                      setResult(null);
                    }}
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: selected ? 'primary.main' : 'divider',
                      bgcolor: selected ? (theme) => alpha(theme.palette.primary.main, 0.06) : 'transparent',
                      transition: 'border-color 0.2s ease, background-color 0.2s ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.desc}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Panel>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <SectionLabel>{tool.label}</SectionLabel>
          <Panel>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <ManageSearchIcon color="primary" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  {tool.desc}
                </Typography>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Target"
                  placeholder={tool.placeholder}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
                {'port' in tool && tool.port && (
                  <TextField
                    size="small"
                    label="Port"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    sx={{ minWidth: 90 }}
                  />
                )}
                <Button
                  variant="contained"
                  onClick={run}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} /> : <PlayArrowIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  Run
                </Button>
              </Stack>
              {error && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {error}
                </Alert>
              )}
              {result && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {result.kind} · {result.findings.length} findings
                  </Typography>
                  <List dense disablePadding>
                    {result.findings.map((f, i) => (
                      <ListItem
                        key={i}
                        sx={{
                          borderLeft: '3px solid',
                          borderColor: 'primary.main',
                          mb: 0.5,
                          bgcolor: 'action.hover',
                          borderRadius: 1,
                        }}
                      >
                        <ListItemText primary={f.label} secondary={f.value} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Stack>
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}
