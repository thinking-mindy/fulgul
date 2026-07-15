"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  alpha,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import DnsIcon from '@mui/icons-material/Dns';
import HttpsIcon from '@mui/icons-material/Https';
import HttpIcon from '@mui/icons-material/Http';
import RouterIcon from '@mui/icons-material/Router';
import PublicIcon from '@mui/icons-material/Public';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import SectionLabel, { Panel } from '../../components/ui/SectionLabel';
import WorkspaceBar from '../../components/pentest/WorkspaceBar';
import type { ReconResult, PentestWorkspace } from '../../types/tauri';

type ReconKind = 'dns' | 'ssl' | 'http_headers' | 'banner' | 'whois';

const TOOLS: {
  id: ReconKind;
  label: string;
  desc: string;
  icon: React.ReactNode;
  placeholder: string;
  port?: boolean;
}[] = [
  { id: 'dns', label: 'DNS Enum', desc: 'A, MX, NS, TXT records', icon: <DnsIcon fontSize="small" />, placeholder: 'example.com' },
  { id: 'whois', label: 'WHOIS', desc: 'Registrar & domain intel', icon: <PublicIcon fontSize="small" />, placeholder: 'example.com' },
  { id: 'ssl', label: 'TLS / SSL', desc: 'Certificate & expiry check', icon: <HttpsIcon fontSize="small" />, placeholder: 'host.example.com', port: true },
  { id: 'http_headers', label: 'HTTP Headers', desc: 'Security header analysis', icon: <HttpIcon fontSize="small" />, placeholder: 'https://target.example.com' },
  { id: 'banner', label: 'Banner Grab', desc: 'Service fingerprint', icon: <RouterIcon fontSize="small" />, placeholder: '192.168.1.1', port: true },
];

const severityColor = (s: string) => {
  switch (s) {
    case 'critical':
      return '#ef4444';
    case 'high':
      return '#f97316';
    case 'medium':
      return '#eab308';
    case 'low':
      return '#3b82f6';
    default:
      return '#64748b';
  }
};

export default function ReconHubPage() {
  const [active, setActive] = useState<ReconKind>('dns');
  const [target, setTarget] = useState('');
  const [port, setPort] = useState('443');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReconResult | null>(null);
  const [history, setHistory] = useState<ReconResult[]>([]);

  useEffect(() => {
    invoke<PentestWorkspace>('get_pentest_workspace')
      .then((ws) => {
        if (ws.primaryTarget && !target) setTarget(ws.primaryTarget);
      })
      .catch(() => {});
  }, [target]);

  const tool = TOOLS.find((t) => t.id === active)!;

  const runRecon = async () => {
    if (!target.trim()) {
      setError('Enter a target');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let res: ReconResult;
      switch (active) {
        case 'dns':
          res = await invoke('run_recon_dns', { domain: target.trim() });
          break;
        case 'whois':
          res = await invoke('run_recon_whois', { domain: target.trim() });
          break;
        case 'ssl':
          res = await invoke('run_recon_ssl', { host: target.trim(), port: parseInt(port, 10) || 443 });
          break;
        case 'http_headers':
          res = await invoke('run_recon_http_headers', { url: target.trim() });
          break;
        case 'banner':
          res = await invoke('run_recon_banner', { host: target.trim(), port: parseInt(port, 10) || 80 });
          break;
      }
      setResult(res);
      setHistory((h) => [res, ...h].slice(0, 12));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        eyebrow="Phase 2 · Recon"
        title="Surface mapping"
        subtitle="DNS, WHOIS, TLS, headers, and banners — logged for reports."
      />

      <WorkspaceBar />

      <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
        Authorized targets only. Every recon run is saved to your pentest activity log.
      </Alert>

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Tools" value={TOOLS.length} icon={<TravelExploreIcon fontSize="small" />} tone="primary" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Session runs" value={history.length} icon={<DnsIcon fontSize="small" />} tone="info" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Last findings"
            value={result?.findings.length ?? '—'}
            icon={<HttpsIcon fontSize="small" />}
            tone="warning"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Duration"
            value={result ? `${result.durationMs}ms` : '—'}
            icon={<RouterIcon fontSize="small" />}
            tone="success"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionLabel>Toolkit</SectionLabel>
          <Panel>
            <Stack spacing={1}>
              {TOOLS.map((t) => {
                const selected = active === t.id;
                return (
                  <Box
                    key={t.id}
                    onClick={() => {
                      setActive(t.id);
                      setResult(null);
                      setError(null);
                    }}
                    sx={{
                      p: 1.5,
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
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ color: selected ? 'primary.main' : 'text.secondary' }}>{t.icon}</Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {t.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t.desc}
                        </Typography>
                      </Box>
                    </Stack>
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
              <Typography variant="caption" color="text.secondary">
                {tool.desc}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Target"
                  placeholder={tool.placeholder}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runRecon()}
                />
                {tool.port && (
                  <TextField
                    size="small"
                    label="Port"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    sx={{ minWidth: 100 }}
                  />
                )}
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
                  onClick={runRecon}
                  disabled={loading}
                  sx={{ minWidth: 120, alignSelf: { sm: 'center' }, borderRadius: 2 }}
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
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    {result.kind} · {result.success ? 'Success' : 'No data'} · {result.durationMs}ms
                  </Typography>

                  {result.findings.length > 0 ? (
                    <List dense disablePadding>
                      {result.findings.map((f, i) => (
                        <ListItem
                          key={i}
                          sx={{
                            borderLeft: `3px solid ${severityColor(f.severity)}`,
                            mb: 1,
                            bgcolor: alpha(severityColor(f.severity), 0.06),
                            borderRadius: 1,
                          }}
                        >
                          <ListItemText
                            primary={f.label}
                            secondary={f.value}
                            primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem' }}
                            secondaryTypographyProps={{ fontSize: '0.8rem', sx: { wordBreak: 'break-all' } }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography color="text.secondary" variant="body2">
                      No structured findings — see raw output.
                    </Typography>
                  )}

                  {result.rawOutput && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Raw output
                      </Typography>
                      <Box
                        component="pre"
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'action.hover',
                          fontSize: '0.75rem',
                          overflow: 'auto',
                          maxHeight: 240,
                          m: 0,
                          fontFamily: 'monospace',
                        }}
                      >
                        {result.rawOutput.slice(0, 4000)}
                      </Box>
                    </>
                  )}
                </Box>
              )}
            </Stack>
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}
