"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Chip,
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
import GlassCard from '../../components/ui/GlassCard';
import StatCard from '../../components/ui/StatCard';
import WorkspaceBar from '../../components/pentest/WorkspaceBar';
import type { ReconResult, PentestWorkspace } from '../../types/tauri';

type ReconKind = 'dns' | 'ssl' | 'http_headers' | 'banner' | 'whois';

const TOOLS: {
  id: ReconKind;
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  placeholder: string;
  port?: boolean;
}[] = [
  { id: 'dns', label: 'DNS Enum', desc: 'A, MX, NS, TXT records', icon: <DnsIcon />, color: '#3b82f6', placeholder: 'example.com' },
  { id: 'whois', label: 'WHOIS', desc: 'Registrar & domain intel', icon: <PublicIcon />, color: '#06b6d4', placeholder: 'example.com' },
  { id: 'ssl', label: 'TLS / SSL', desc: 'Certificate & expiry check', icon: <HttpsIcon />, color: '#8b5cf6', placeholder: 'host.example.com', port: true },
  { id: 'http_headers', label: 'HTTP Headers', desc: 'Security header analysis', icon: <HttpIcon />, color: '#f59e0b', placeholder: 'https://target.example.com' },
  { id: 'banner', label: 'Banner Grab', desc: 'Service fingerprint', icon: <RouterIcon />, color: '#ef4444', placeholder: '192.168.1.1', port: true },
];

const severityColor = (s: string) => {
  switch (s) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#3b82f6';
    default: return '#64748b';
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
    invoke<PentestWorkspace>('get_pentest_workspace').then((ws) => {
      if (ws.primaryTarget && !target) setTarget(ws.primaryTarget);
    }).catch(() => {});
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
    <Box>
      <PageHeader
        eyebrow="Offensive · Recon"
        title="Map the surface."
        titleAccent="Before you strike."
        subtitle="OSINT and surface mapping — DNS, WHOIS, TLS, HTTP headers, banners. Every run is logged to Engagement Reports."
        chips={['DNS', 'TLS', 'Headers', 'Auto-logged']}
      />

      <WorkspaceBar />

      <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
        Authorized targets only. Every recon run is saved to your pentest activity log for reporting.
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Tools" value={TOOLS.length} icon={<TravelExploreIcon />} tone="primary" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Session runs" value={history.length} icon={<DnsIcon />} tone="info" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Last findings"
            value={result?.findings.length ?? '—'}
            icon={<HttpsIcon />}
            tone="warning"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Duration"
            value={result ? `${result.durationMs}ms` : '—'}
            icon={<RouterIcon />}
            tone="success"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <GlassCard>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
              Recon toolkit
            </Typography>
            <Stack spacing={1}>
              {TOOLS.map((t) => (
                <Box
                  key={t.id}
                  onClick={() => { setActive(t.id); setResult(null); setError(null); }}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: active === t.id ? t.color : 'divider',
                    bgcolor: active === t.id ? alpha(t.color, 0.08) : 'transparent',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: t.color, bgcolor: alpha(t.color, 0.05) },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box sx={{ color: t.color }}>{t.icon}</Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{t.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.desc}</Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </GlassCard>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <GlassCard highlight>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ color: tool.color }}>{tool.icon}</Box>
                <Typography variant="h6">{tool.label}</Typography>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Target"
                  placeholder={tool.placeholder}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runRecon()}
                />
                {tool.port && (
                  <TextField
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
                  sx={{ minWidth: 120, alignSelf: { sm: 'center' } }}
                >
                  Run
                </Button>
              </Stack>

              {error && <Alert severity="error">{error}</Alert>}

              {result && (
                <Box>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
                    <Chip label={result.kind} size="small" color="primary" variant="outlined" />
                    <Chip
                      label={result.success ? 'Success' : 'No data'}
                      size="small"
                      color={result.success ? 'success' : 'default'}
                    />
                    <Chip label={`${result.durationMs}ms`} size="small" variant="outlined" />
                  </Stack>

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
                    <Typography color="text.secondary" variant="body2">No structured findings — see raw output.</Typography>
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
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
}
