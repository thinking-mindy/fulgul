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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import SectionLabel, { Panel } from '../../components/ui/SectionLabel';
import WorkspaceBar from '../../components/pentest/WorkspaceBar';
import type { Engagement, ActiveEngagement } from '../../types/tauri';

export default function EngagementPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [active, setActive] = useState<ActiveEngagement>({});
  const [selected, setSelected] = useState<Engagement | null>(null);
  const [form, setForm] = useState({ name: '', client: '', scope: '', authorizedBy: '', authRef: '' });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [list, act] = await Promise.all([
      invoke<Engagement[]>('list_engagements'),
      invoke<ActiveEngagement>('get_active_engagement'),
    ]);
    setEngagements(list);
    setActive(act);
    if (act.engagementId) {
      const eng = list.find((e) => e.id === act.engagementId);
      if (eng) setSelected(eng);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const create = async () => {
    try {
      const scopeTargets = form.scope.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      const eng = await invoke<Engagement>('create_engagement', {
        name: form.name,
        client: form.client,
        scopeTargets,
        authorizedBy: form.authorizedBy,
        authorizationRef: form.authRef,
      });
      setSelected(eng);
      await load();
      setForm({ name: '', client: '', scope: '', authorizedBy: '', authRef: '' });
    } catch (e) {
      setError(String(e));
    }
  };

  const save = async () => {
    if (!selected) return;
    try {
      await invoke('update_engagement', { engagement: selected });
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const activate = async (id: string) => {
    await invoke('set_active_engagement', { engagementId: id });
    await load();
  };

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        eyebrow="Phase 1 · Planning"
        title="Engagement scope"
        subtitle="Authorization, rules of engagement, and in-scope targets."
      />
      <WorkspaceBar />
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <SectionLabel>New engagement</SectionLabel>
          <Panel>
            <Stack spacing={2}>
              <TextField
                label="Engagement name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Client"
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="In-scope targets"
                multiline
                rows={3}
                placeholder="example.com&#10;192.168.1.0/24"
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Authorized by"
                value={form.authorizedBy}
                onChange={(e) => setForm({ ...form, authorizedBy: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Authorization ref (SOW/ticket)"
                value={form.authRef}
                onChange={(e) => setForm({ ...form, authRef: e.target.value })}
                fullWidth
                size="small"
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={create}
                sx={{ borderRadius: 2 }}
              >
                Create & activate
              </Button>
            </Stack>
          </Panel>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <SectionLabel>Active engagement</SectionLabel>
          <Panel>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Shared across Red Team tools
              </Typography>
              {active.engagementId && (
                <Chip label="Active" color="success" size="small" sx={{ height: 22, fontWeight: 700 }} />
              )}
            </Stack>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Select</InputLabel>
              <Select
                label="Select"
                value={selected?.id ?? ''}
                onChange={(e) => {
                  const eng = engagements.find((x) => x.id === e.target.value);
                  setSelected(eng ?? null);
                  if (eng) activate(eng.id);
                }}
              >
                {engagements.map((e) => (
                  <MenuItem key={e.id} value={e.id}>
                    {e.name} — {e.client}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selected ? (
              <Stack spacing={2}>
                <TextField
                  label="Rules of engagement"
                  multiline
                  rows={4}
                  value={selected.rulesOfEngagement}
                  onChange={(e) => setSelected({ ...selected, rulesOfEngagement: e.target.value })}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Emergency contact"
                  value={selected.emergencyContact}
                  onChange={(e) => setSelected({ ...selected, emergencyContact: e.target.value })}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Notes"
                  multiline
                  rows={3}
                  value={selected.notes}
                  onChange={(e) => setSelected({ ...selected, notes: e.target.value })}
                  fullWidth
                  size="small"
                />
                {selected.scopeTargets.length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Scope: {selected.scopeTargets.join(' · ')}
                  </Typography>
                )}
                <Button
                  startIcon={<SaveIcon />}
                  variant="contained"
                  onClick={save}
                  sx={{ borderRadius: 2 }}
                >
                  Save engagement
                </Button>
              </Stack>
            ) : (
              <Typography color="text.secondary" variant="body2">
                Create or select an engagement to begin.
              </Typography>
            )}
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}
