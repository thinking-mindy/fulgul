"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  TextField,
  Button,
  Stack,
  Chip,
  Alert,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import SectionLabel, { Panel } from '../../components/ui/SectionLabel';
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
    <Box sx={{ width: '100%' }}>
      <PageHeader
        eyebrow="Asset scope"
        title="What you protect"
        subtitle="Register critical assets and networks used by scans and reports."
      />
      <DefenseWorkspaceBar onUpdate={setWorkspace} />
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Panel>
            <SectionLabel>Register asset</SectionLabel>
            <Stack spacing={2}>
              <TextField
                label="Hostname / identifier"
                value={form.hostname}
                onChange={(e) => setForm({ ...form, hostname: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="IP (optional)"
                value={form.ip}
                onChange={(e) => setForm({ ...form, ip: e.target.value })}
                fullWidth
                size="small"
              />
              <FormControl fullWidth size="small">
                <InputLabel>Criticality</InputLabel>
                <Select
                  label="Criticality"
                  value={form.criticality}
                  onChange={(e) => setForm({ ...form, criticality: e.target.value })}
                >
                  {CRITICALITY.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Owner / team"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Notes"
                multiline
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                fullWidth
                size="small"
              />
              <Button
                variant="contained"
                color="success"
                startIcon={<AddIcon />}
                onClick={addAsset}
                sx={{ borderRadius: 2 }}
              >
                Add asset
              </Button>
            </Stack>

            <Typography
              variant="overline"
              sx={{ fontWeight: 700, letterSpacing: '0.12em', color: 'text.secondary', mt: 3.5, mb: 1.5, display: 'block' }}
            >
              Protected network
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="10.0.0.0/24"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
              />
              <Button variant="outlined" onClick={addNetwork} sx={{ borderRadius: 2 }}>
                Add
              </Button>
            </Stack>
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Panel>
            <SectionLabel>Asset inventory</SectionLabel>
            <Stack spacing={1.25} sx={{ mb: 2.5 }}>
              {!workspace?.assets.length ? (
                <Typography variant="body2" color="text.secondary">
                  No assets registered. Scans will auto-register discovered hosts.
                </Typography>
              ) : (
                workspace.assets.map((a) => (
                  <Box
                    key={a.id}
                    sx={{
                      p: 1.75,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <ShieldIcon fontSize="small" color="success" />
                      <Typography sx={{ fontWeight: 700, flex: 1 }}>{a.hostname}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                        {a.criticality}
                        {a.lastScore != null ? ` · ${a.lastScore}/100` : ''}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {a.ip ? `${a.ip} · ` : ''}{a.owner || 'unassigned'} · {a.vulnCount} vulns · via {a.source}
                    </Typography>
                  </Box>
                ))
              )}
            </Stack>

            {workspace?.protectedNetworks.length ? (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Protected networks
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {workspace.protectedNetworks.map((n) => (
                    <Chip key={n} label={n} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                  ))}
                </Stack>
              </Box>
            ) : null}

            <TextField
              label="Compliance & scope notes"
              multiline
              rows={4}
              fullWidth
              size="small"
              value={workspace?.complianceNotes ?? ''}
              onChange={(e) => workspace && setWorkspace({ ...workspace, complianceNotes: e.target.value })}
            />
            <Button
              startIcon={<SaveIcon />}
              sx={{ mt: 2, borderRadius: 2 }}
              variant="contained"
              color="success"
              onClick={saveNotes}
            >
              Save notes
            </Button>
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}
