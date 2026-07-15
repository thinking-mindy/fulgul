"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import { Box, TextField, Button, Stack, Chip, Alert, Typography, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import DefenseWorkspaceBar from '../../components/defense/DefenseWorkspaceBar';
import type { DefenseWorkspace, DefenseAsset } from '../../types/tauri';

const CRITICALITY = ['low', 'medium', 'high', 'critical'];

export default function DefenseScopePage() {
  const [workspace, setWorkspace] = useState<DefenseWorkspace | null>(null);
  const [form, setForm] = useState({ hostname: '', ip: '', criticality: 'high', owner: '', notes: '' });
  const [network, setNetwork] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const ws = await invoke<DefenseWorkspace>('get_defense_workspace');
    setWorkspace(ws);
  };

  useEffect(() => { load().catch(() => {}); }, []);

  const addAsset = async () => {
    if (!form.hostname.trim()) return;
    try {
      await invoke<DefenseAsset>('add_defense_asset', {
        hostname: form.hostname,
        ip: form.ip || null,
        criticality: form.criticality,
        owner: form.owner,
        notes: form.notes || null,
      });
      setForm({ hostname: '', ip: '', criticality: 'high', owner: '', notes: '' });
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const addNetwork = async () => {
    if (!network.trim()) return;
    try {
      await invoke('add_defense_network', { cidr: network });
      setNetwork('');
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const saveNotes = async () => {
    if (!workspace) return;
    await invoke('update_defense_workspace', { workspace });
    await load();
  };

  return (
    <Box>
      <PageHeader eyebrow="Phase 1 · Asset scope" title="Know what" titleAccent="you protect." subtitle="Register critical assets and protected networks — data flows into scans, vuln tracking, and reports." chips={['Asset registry', 'Criticality', 'Shared']} />
      <DefenseWorkspaceBar onUpdate={setWorkspace} />
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <GlassCard>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Register asset</Typography>
            <Stack spacing={2}>
              <TextField label="Hostname / identifier" value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} fullWidth />
              <TextField label="IP (optional)" value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} fullWidth />
              <FormControl fullWidth size="small">
                <InputLabel>Criticality</InputLabel>
                <Select label="Criticality" value={form.criticality} onChange={(e) => setForm({ ...form, criticality: e.target.value })}>
                  {CRITICALITY.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Owner / team" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} fullWidth />
              <TextField label="Notes" multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} fullWidth />
              <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={addAsset}>Add asset</Button>
            </Stack>
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Protected network</Typography>
            <Stack direction="row" spacing={1}>
              <TextField size="small" fullWidth placeholder="10.0.0.0/24" value={network} onChange={(e) => setNetwork(e.target.value)} />
              <Button variant="outlined" onClick={addNetwork}>Add</Button>
            </Stack>
          </GlassCard>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <GlassCard highlight>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Asset inventory</Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
              {!workspace?.assets.length ? (
                <Typography color="text.secondary">No assets registered. Scans will auto-register discovered hosts.</Typography>
              ) : (
                workspace.assets.map((a) => (
                  <Box key={a.id} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <ShieldIcon fontSize="small" color="success" />
                      <Typography fontWeight={700}>{a.hostname}</Typography>
                      <Chip label={a.criticality} size="small" />
                      {a.lastScore != null && <Chip label={`${a.lastScore}/100`} size="small" color="primary" variant="outlined" />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {a.ip ? `${a.ip} · ` : ''}{a.owner || 'unassigned'} · {a.vulnCount} vulns · via {a.source}
                    </Typography>
                  </Box>
                ))
              )}
            </Stack>
            {workspace?.protectedNetworks.length ? (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 2 }}>
                {workspace.protectedNetworks.map((n) => <Chip key={n} label={n} size="small" variant="outlined" />)}
              </Stack>
            ) : null}
            <TextField
              label="Compliance & scope notes"
              multiline
              rows={4}
              fullWidth
              value={workspace?.complianceNotes ?? ''}
              onChange={(e) => workspace && setWorkspace({ ...workspace, complianceNotes: e.target.value })}
            />
            <Button startIcon={<SaveIcon />} sx={{ mt: 2 }} variant="contained" color="success" onClick={saveNotes}>Save notes</Button>
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
}
