"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  alpha,
  CircularProgress,
} from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import TerminalIcon from '@mui/icons-material/Terminal';
import LanguageIcon from '@mui/icons-material/Language';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RadarIcon from '@mui/icons-material/Radar';
import KeyIcon from '@mui/icons-material/Key';
import GppBadIcon from '@mui/icons-material/GppBad';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SignalWifi4BarIcon from '@mui/icons-material/SignalWifi4Bar';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import StatCard from '../../components/ui/StatCard';
import type {
  BruteJob,
  HttpBruteParams,
  HttpUserEnumResult,
  SshBruteParams,
  UserEnumResult,
  WifiNetwork,
  WordlistInfo,
} from '../../types/tauri';

type Vector = 'wifi' | 'ssh' | 'http' | 'wordlists';

const VECTORS: { id: Vector; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { id: 'wifi', label: 'WiFi', desc: 'Scan & crack WPA labs', icon: <WifiIcon />, color: '#3b82f6' },
  { id: 'ssh', label: 'SSH', desc: 'Banner, enum, brute', icon: <TerminalIcon />, color: '#8b5cf6' },
  { id: 'http', label: 'Web login', desc: 'Form enum & brute', icon: <LanguageIcon />, color: '#f59e0b' },
  { id: 'wordlists', label: 'Wordlists', desc: 'Upload & manage', icon: <UploadFileIcon />, color: '#10b981' },
];

function SectionLabel({ step, title, subtitle }: { step: number; title: string; subtitle?: string }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {step}
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

function SignalBars({ signal }: { signal: number }) {
  const pct = Math.min(100, Math.max(0, signal > 0 && signal <= 100 ? signal : ((signal + 100) / 100) * 100));
  const bars = pct > 75 ? 4 : pct > 50 ? 3 : pct > 25 ? 2 : 1;
  return (
    <Stack direction="row" spacing={0.25} alignItems="flex-end" sx={{ height: 14 }}>
      {[1, 2, 3, 4].map((b) => (
        <Box
          key={b}
          sx={{
            width: 4,
            height: 4 + b * 2,
            borderRadius: 0.5,
            bgcolor: b <= bars ? 'primary.main' : 'action.disabled',
          }}
        />
      ))}
    </Stack>
  );
}

export default function CredentialsPage() {
  const [vector, setVector] = useState<Vector>('wifi');
  const [error, setError] = useState<string | null>(null);
  const [wordlists, setWordlists] = useState<WordlistInfo[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [job, setJob] = useState<BruteJob | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const [wifiNetworks, setWifiNetworks] = useState<WifiNetwork[]>([]);
  const [wifiScanning, setWifiScanning] = useState(false);
  const [selectedSsid, setSelectedSsid] = useState('');
  const [wifiWordlist, setWifiWordlist] = useState('wifi-common.txt');

  const [sshHost, setSshHost] = useState('127.0.0.1');
  const [sshPort, setSshPort] = useState('2222');
  const [sshUser, setSshUser] = useState('');
  const [sshUserWordlist, setSshUserWordlist] = useState('common-usernames.txt');
  const [sshPassWordlist, setSshPassWordlist] = useState('top-passwords.txt');
  const [sshEnumInput, setSshEnumInput] = useState('admin\nroot\nuser\ntest');
  const [sshEnumResults, setSshEnumResults] = useState<UserEnumResult[]>([]);
  const [sshBanner, setSshBanner] = useState<string | null>(null);
  const [sshProbing, setSshProbing] = useState(false);
  const [sshEnumerating, setSshEnumerating] = useState(false);

  const [httpUrl, setHttpUrl] = useState('http://127.0.0.1:8081/login');
  const [httpUserField, setHttpUserField] = useState('username');
  const [httpPassField, setHttpPassField] = useState('password');
  const [httpUser, setHttpUser] = useState('admin');
  const [httpUserWordlist, setHttpUserWordlist] = useState('common-usernames.txt');
  const [httpPassWordlist, setHttpPassWordlist] = useState('top-passwords.txt');
  const [httpEnumInput, setHttpEnumInput] = useState('admin\nroot\nuser');
  const [httpEnumResults, setHttpEnumResults] = useState<HttpUserEnumResult[]>([]);
  const [httpEnumerating, setHttpEnumerating] = useState(false);

  const [uploadName, setUploadName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const jobRunning = job?.status === 'running';
  const totalWordlistLines = wordlists.reduce((s, w) => s + w.lineCount, 0);

  const loadWordlists = useCallback(async () => {
    try {
      const list = await invoke<WordlistInfo[]>('list_wordlists');
      setWordlists(list);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadWordlists();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadWordlists]);

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const j = await invoke<BruteJob>('get_brute_job', { jobId });
      setJob(j);
      if (j.status !== 'running' && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch {
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, []);

  const startPolling = (jobId: string) => {
    setActiveJobId(jobId);
    if (pollRef.current) clearInterval(pollRef.current);
    pollJob(jobId);
    pollRef.current = setInterval(() => pollJob(jobId), 1000);
  };

  const stopJob = async () => {
    if (!activeJobId) return;
    try {
      await invoke('stop_brute_job', { jobId: activeJobId });
      await pollJob(activeJobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop job');
    }
  };

  const scanWifi = async () => {
    setWifiScanning(true);
    setError(null);
    try {
      const nets = await invoke<WifiNetwork[]>('scan_wifi_networks');
      setWifiNetworks(nets);
      if (nets.length === 0) setError('No networks found — check WiFi adapter and permissions.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WiFi scan failed');
    } finally {
      setWifiScanning(false);
    }
  };

  const startWifiBrute = async () => {
    if (!selectedSsid) { setError('Select a WiFi network first'); return; }
    setError(null);
    try {
      const net = wifiNetworks.find((n) => n.ssid === selectedSsid);
      const jobId = await invoke<string>('start_wifi_bruteforce', {
        ssid: selectedSsid,
        wordlistId: wifiWordlist,
        bssid: net?.bssid || null,
      });
      startPolling(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start WiFi test');
    }
  };

  const probeSsh = async () => {
    setSshProbing(true);
    setError(null);
    try {
      const banner = await invoke<string>('check_ssh_target', {
        host: sshHost,
        port: parseInt(sshPort, 10) || 22,
      });
      setSshBanner(banner);
    } catch (err) {
      setSshBanner(null);
      setError(err instanceof Error ? err.message : 'SSH unreachable');
    } finally {
      setSshProbing(false);
    }
  };

  const enumSshUsers = async () => {
    setSshEnumerating(true);
    setError(null);
    const users = sshEnumInput.split('\n').map((u) => u.trim()).filter(Boolean);
    try {
      const results = await invoke<UserEnumResult[]>('enumerate_ssh_users', {
        host: sshHost,
        port: parseInt(sshPort, 10) || 22,
        usernames: users,
      });
      setSshEnumResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSH user enum failed');
    } finally {
      setSshEnumerating(false);
    }
  };

  const startSshBrute = async () => {
    setError(null);
    const params: SshBruteParams = {
      host: sshHost,
      port: parseInt(sshPort, 10) || 22,
      passwordWordlistId: sshPassWordlist,
      threads: 4,
    };
    if (sshUser.trim()) params.username = sshUser.trim();
    else params.usernameWordlistId = sshUserWordlist;
    try {
      const jobId = await invoke<string>('start_ssh_bruteforce', { params });
      startPolling(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SSH brute failed to start');
    }
  };

  const enumHttpUsers = async () => {
    setHttpEnumerating(true);
    setError(null);
    const users = httpEnumInput.split('\n').map((u) => u.trim()).filter(Boolean);
    try {
      const results = await invoke<HttpUserEnumResult[]>('enumerate_http_users', {
        url: httpUrl,
        usernameField: httpUserField,
        passwordField: httpPassField,
        usernames: users,
        failureIndicators: ['invalid', 'incorrect', 'failed'],
      });
      setHttpEnumResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'HTTP user enum failed');
    } finally {
      setHttpEnumerating(false);
    }
  };

  const startHttpBrute = async () => {
    setError(null);
    const params: HttpBruteParams = {
      url: httpUrl,
      usernameField: httpUserField,
      passwordField: httpPassField,
      passwordWordlistId: httpPassWordlist,
      failureIndicators: ['invalid', 'incorrect', 'failed', 'denied'],
      successIndicators: ['dashboard', 'welcome', 'logout', 'success'],
    };
    if (httpUser.trim()) params.username = httpUser.trim();
    else params.usernameWordlistId = httpUserWordlist;
    try {
      const jobId = await invoke<string>('start_http_bruteforce', { params });
      startPolling(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'HTTP brute failed to start');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const content = await file.text();
      await invoke('save_wordlist', { name: uploadName.trim() || file.name, content });
      setUploadName('');
      await loadWordlists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteWl = async (id: string) => {
    try {
      await invoke('delete_wordlist', { id });
      await loadWordlists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const WordlistSelect = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select value={value} label={label} onChange={(e) => onChange(e.target.value)}>
        {wordlists.map((w) => (
          <MenuItem key={w.id} value={w.id}>
            {w.name} · {w.lineCount.toLocaleString()} lines
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const EnumTable = ({ rows, kind }: { rows: UserEnumResult[] | HttpUserEnumResult[]; kind: 'ssh' | 'http' }) => (
    <Box sx={{ overflow: 'auto', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 700 }}>Username</TableCell>
            {kind === 'http' && <TableCell sx={{ fontWeight: 700 }}>HTTP</TableCell>}
            <TableCell sx={{ fontWeight: 700 }}>Verdict</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Detail</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.username} sx={{ bgcolor: r.likelyValid ? alpha('#10b981', 0.06) : undefined }}>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.username}</TableCell>
              {kind === 'http' && (
                <TableCell>{(r as HttpUserEnumResult).statusCode || '—'}</TableCell>
              )}
              <TableCell>
                <Chip
                  icon={r.likelyValid ? <CheckCircleIcon /> : undefined}
                  label={r.likelyValid ? 'Likely valid' : 'Unlikely'}
                  size="small"
                  color={r.likelyValid ? 'success' : 'default'}
                  variant={r.likelyValid ? 'filled' : 'outlined'}
                />
              </TableCell>
              <TableCell>
                <Typography variant="caption" color="text.secondary">{r.detail}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );

  return (
    <Box>
      <PageHeader
        eyebrow="Offensive · Credential lab"
        title="Break creds."
        titleAccent="With permission."
        subtitle="Recon → enumerate users → spray wordlists. Hard timeouts, live job console, stop anytime."
        chips={['WiFi', 'SSH', 'HTTP', 'Wordlists']}
      />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard label="Wordlists" value={wordlists.length} hint={`${totalWordlistLines.toLocaleString()} total lines`} icon={<UploadFileIcon />} tone="primary" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard label="Job" value={jobRunning ? 'Live' : job?.status ?? 'Idle'} hint={job?.target ?? 'No active run'} icon={<RadarIcon />} tone={jobRunning ? 'warning' : 'primary'} />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard label="Vector" value={VECTORS.find((v) => v.id === vector)?.label ?? '—'} hint="Current attack surface" icon={<KeyIcon />} tone="primary" />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <StatCard label="Policy" value="Auth only" hint="Authorized targets required" icon={<GppBadIcon />} tone="success" />
        </Grid>
      </Grid>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 3 }}>
        <Alert severity="warning" sx={{ flex: 1, py: 0.5 }}>
          Unauthorized access is illegal. Labs, CTFs, and systems you own only.
        </Alert>
        <Alert severity="info" sx={{ flex: 1, py: 0.5 }}>
          Linux: nmcli + hydra · Windows: netsh + plink/OpenSSH
        </Alert>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        {/* Left — attack vector picker */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Stack spacing={1.5}>
            <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: '0.1em', color: 'text.secondary', px: 0.5 }}>
              Attack surface
            </Typography>
            {VECTORS.map((v) => {
              const active = vector === v.id;
              return (
                <GlassCard
                  key={v.id}
                  highlight={active}
                  onClick={() => setVector(v.id)}
                  sx={{
                    borderLeft: active ? `3px solid ${v.color}` : undefined,
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(v.color, 0.15),
                        color: v.color,
                      }}
                    >
                      {v.icon}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {v.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {v.desc}
                      </Typography>
                    </Box>
                  </Stack>
                </GlassCard>
              );
            })}
          </Stack>
        </Grid>

        {/* Center — config panels */}
        <Grid size={{ xs: 12, md: job ? 5 : 9 }}>
          {vector === 'wifi' && (
            <Stack spacing={2.5}>
              <GlassCard>
                <SectionLabel step={1} title="Recon — scan airspace" subtitle="Discover in-range networks (nmcli / netsh)" />
                <Button variant="outlined" startIcon={wifiScanning ? <CircularProgress size={16} /> : <RefreshIcon />} onClick={scanWifi} disabled={wifiScanning} sx={{ mb: 2 }}>
                  {wifiScanning ? 'Scanning…' : 'Scan nearby WiFi'}
                </Button>
                {wifiNetworks.length > 0 && (
                  <Grid container spacing={1.5}>
                    {wifiNetworks.map((n) => {
                      const selected = selectedSsid === n.ssid;
                      return (
                        <Grid size={{ xs: 12, sm: 6 }} key={`${n.ssid}-${n.bssid}`}>
                          <Box
                            onClick={() => setSelectedSsid(n.ssid)}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              border: '2px solid',
                              borderColor: selected ? 'primary.main' : 'divider',
                              bgcolor: selected ? alpha('#10b981', 0.06) : 'background.default',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': { borderColor: 'primary.light' },
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                                  {n.ssid}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {n.security}
                                </Typography>
                              </Box>
                              <SignalBars signal={n.signal} />
                            </Stack>
                            {selected && (
                              <Chip label="Target locked" size="small" color="primary" sx={{ mt: 1, height: 20, fontSize: '0.65rem' }} />
                            )}
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </GlassCard>

              <GlassCard>
                <SectionLabel step={2} title="Attack — passphrase spray" subtitle="One attempt at a time, 8–12s cap each" />
                <Stack spacing={2}>
                  <WordlistSelect value={wifiWordlist} onChange={setWifiWordlist} label="Password wordlist" />
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<PlayArrowIcon />}
                    onClick={startWifiBrute}
                    disabled={!selectedSsid || jobRunning}
                    fullWidth
                  >
                    {selectedSsid ? `Attack "${selectedSsid}"` : 'Select a network first'}
                  </Button>
                </Stack>
              </GlassCard>
            </Stack>
          )}

          {vector === 'ssh' && (
            <Stack spacing={2.5}>
              <GlassCard>
                <SectionLabel step={1} title="Target — probe SSH" subtitle="TCP connect + banner grab" />
                <Grid container spacing={2} sx={{ mb: sshBanner ? 2 : 0 }}>
                  <Grid size={{ xs: 12, sm: 7 }}>
                    <TextField label="Host" value={sshHost} onChange={(e) => setSshHost(e.target.value)} size="small" fullWidth />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField label="Port" value={sshPort} onChange={(e) => setSshPort(e.target.value)} size="small" fullWidth />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 2 }}>
                    <Button variant="outlined" fullWidth onClick={probeSsh} disabled={sshProbing} sx={{ height: '100%' }}>
                      {sshProbing ? '…' : 'Probe'}
                    </Button>
                  </Grid>
                </Grid>
                {sshBanner && (
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha('#10b981', 0.08), border: '1px solid', borderColor: 'success.main', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {sshBanner}
                  </Box>
                )}
              </GlassCard>

              <GlassCard>
                <SectionLabel step={2} title="Enumerate — valid usernames" subtitle="SSH auth response fingerprinting" />
                <TextField label="Candidates (one per line)" value={sshEnumInput} onChange={(e) => setSshEnumInput(e.target.value)} multiline rows={4} size="small" fullWidth sx={{ mb: 2 }} />
                <Button variant="outlined" startIcon={sshEnumerating ? <CircularProgress size={16} /> : <SearchIcon />} onClick={enumSshUsers} disabled={sshEnumerating} sx={{ mb: 2 }}>
                  Run enumeration
                </Button>
                {sshEnumResults.length > 0 && <EnumTable rows={sshEnumResults} kind="ssh" />}
              </GlassCard>

              <GlassCard highlight>
                <SectionLabel step={3} title="Brute — credential spray" subtitle="hydra fast path, sshpass/plink fallback" />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Single username (optional)" value={sshUser} onChange={(e) => setSshUser(e.target.value)} size="small" fullWidth helperText="Or use wordlist below" />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <WordlistSelect value={sshUserWordlist} onChange={setSshUserWordlist} label="Username wordlist" />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <WordlistSelect value={sshPassWordlist} onChange={setSshPassWordlist} label="Password wordlist" />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button variant="contained" size="large" startIcon={<PlayArrowIcon />} onClick={startSshBrute} disabled={jobRunning} fullWidth>
                      Launch SSH brute
                    </Button>
                  </Grid>
                </Grid>
              </GlassCard>
            </Stack>
          )}

          {vector === 'http' && (
            <Stack spacing={2.5}>
              <GlassCard>
                <SectionLabel step={1} title="Target — login form" subtitle="Point at the POST endpoint" />
                <Stack spacing={2}>
                  <TextField label="Login URL" value={httpUrl} onChange={(e) => setHttpUrl(e.target.value)} size="small" fullWidth />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <TextField label="Username field" value={httpUserField} onChange={(e) => setHttpUserField(e.target.value)} size="small" fullWidth />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <TextField label="Password field" value={httpPassField} onChange={(e) => setHttpPassField(e.target.value)} size="small" fullWidth />
                    </Grid>
                  </Grid>
                </Stack>
              </GlassCard>

              <GlassCard>
                <SectionLabel step={2} title="Enumerate — username oracle" subtitle="Response length & error-message diffing" />
                <TextField label="Candidates (one per line)" value={httpEnumInput} onChange={(e) => setHttpEnumInput(e.target.value)} multiline rows={3} size="small" fullWidth sx={{ mb: 2 }} />
                <Button variant="outlined" startIcon={httpEnumerating ? <CircularProgress size={16} /> : <SearchIcon />} onClick={enumHttpUsers} disabled={httpEnumerating} sx={{ mb: 2 }}>
                  Enumerate via form
                </Button>
                {httpEnumResults.length > 0 && <EnumTable rows={httpEnumResults} kind="http" />}
              </GlassCard>

              <GlassCard highlight>
                <SectionLabel step={3} title="Brute — login spray" subtitle="reqwest native or hydra http-post-form" />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Single username (optional)" value={httpUser} onChange={(e) => setHttpUser(e.target.value)} size="small" fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <WordlistSelect value={httpUserWordlist} onChange={setHttpUserWordlist} label="Username wordlist" />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <WordlistSelect value={httpPassWordlist} onChange={setHttpPassWordlist} label="Password wordlist" />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button variant="contained" size="large" startIcon={<PlayArrowIcon />} onClick={startHttpBrute} disabled={jobRunning} fullWidth>
                      Launch HTTP brute
                    </Button>
                  </Grid>
                </Grid>
              </GlassCard>
            </Stack>
          )}

          {vector === 'wordlists' && (
            <Stack spacing={2.5}>
              <GlassCard highlight>
                <SectionLabel step={1} title="Upload custom wordlist" subtitle=".txt · .lst · .csv — max 500k lines" />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                  <TextField label="Display name (optional)" value={uploadName} onChange={(e) => setUploadName(e.target.value)} size="small" sx={{ flex: 1 }} />
                  <Button variant="contained" component="label" startIcon={<UploadFileIcon />} sx={{ minWidth: 160 }}>
                    Choose file
                    <input ref={fileInputRef} type="file" accept=".txt,.lst,.csv" hidden onChange={handleFileUpload} />
                  </Button>
                </Stack>
              </GlassCard>

              <GlassCard>
                <SectionLabel step={2} title="Arsenal" subtitle={`${wordlists.length} lists ready`} />
                <Grid container spacing={1.5}>
                  {wordlists.map((w) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={w.id}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.default',
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                              {w.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {w.lineCount.toLocaleString()} lines · {(w.sizeBytes / 1024).toFixed(1)} KB
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.5}>
                            {w.builtin && <Chip label="built-in" size="small" color="primary" variant="outlined" />}
                            {!w.builtin && (
                              <IconButton size="small" color="error" onClick={() => deleteWl(w.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Stack>
                        </Stack>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </GlassCard>
            </Stack>
          )}
        </Grid>

        {/* Right — live job console */}
        {job && (
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ position: { md: 'sticky' }, top: 88 }}>
              <GlassCard highlight sx={{ bgcolor: alpha('#0d1117', 0.4) }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: '0.08em', color: 'primary.main' }}>
                      Live console
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {job.kind.toUpperCase()} → {job.target}
                    </Typography>
                  </Box>
                  <Chip
                    label={job.status}
                    size="small"
                    color={jobRunning ? 'warning' : job.result?.success ? 'success' : 'default'}
                  />
                </Stack>

                <Box sx={{ mb: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {job.progress.tried.toLocaleString()} / {job.progress.total.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {job.progress.percent}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={job.progress.percent}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  {job.progress.current && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block', mt: 0.5 }} noWrap>
                      → {job.progress.current}
                    </Typography>
                  )}
                </Box>

                {job.result && (
                  <Alert severity={job.result.success ? 'success' : 'info'} sx={{ mb: 2, py: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{job.result.message}</Typography>
                    {job.result.credential && (
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', mt: 0.5 }}>
                        {job.result.credential}
                      </Typography>
                    )}
                  </Alert>
                )}

                {jobRunning && (
                  <Button fullWidth color="error" variant="outlined" startIcon={<StopIcon />} onClick={stopJob} sx={{ mb: 2 }}>
                    Stop job
                  </Button>
                )}

                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: '#0d1117',
                    color: '#c9d1d9',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '0.7rem',
                    maxHeight: 280,
                    overflow: 'auto',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {job.logs.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">Waiting for output…</Typography>
                  ) : (
                    job.logs.slice(-20).map((l, i) => (
                      <Box key={i} sx={{ mb: 0.25, color: l.includes('✓') ? 'success.light' : l.includes('✗') ? 'error.light' : 'inherit' }}>
                        {l}
                      </Box>
                    ))
                  )}
                </Box>
              </GlassCard>
            </Box>
          </Grid>
        )}
      </Grid>

      {!job && (
        <GlassCard sx={{ mt: 3, textAlign: 'center', py: 4 }}>
          <SignalWifi4BarIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Pick an attack surface, configure your target, then launch — the live console appears here during a run.
          </Typography>
        </GlassCard>
      )}
    </Box>
  );
}
