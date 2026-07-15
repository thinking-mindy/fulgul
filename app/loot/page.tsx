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
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import SectionLabel, { Panel } from '../../components/ui/SectionLabel';
import WorkspaceBar from '../../components/pentest/WorkspaceBar';
import type { LootItem } from '../../types/tauri';

const KINDS = ['credential', 'flag', 'hash', 'token', 'shell', 'note', 'file'];

export default function LootPage() {
  const [items, setItems] = useState<LootItem[]>([]);
  const [form, setForm] = useState({ kind: 'credential', title: '', value: '', target: '', notes: '' });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const list = await invoke<LootItem[]>('list_loot', { engagementId: null, kind: null, limit: 200 });
    setItems(list);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const add = async () => {
    if (!form.title || !form.value) return;
    try {
      await invoke('add_manual_loot', {
        kind: form.kind,
        title: form.title,
        value: form.value,
        target: form.target,
        notes: form.notes || null,
        tags: null,
      });
      setForm({ kind: 'credential', title: '', value: '', target: '', notes: '' });
      await load();
    } catch (e) {
      setError(String(e));
    }
  };

  const remove = async (id: string) => {
    await invoke('delete_loot_item', { id });
    await load();
  };

  const autoCount = items.filter((i) => i.tags.includes('auto-capture')).length;

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        eyebrow="Phase 6 · Post-exploitation"
        title="Loot vault"
        subtitle="Credentials, flags, and hashes — auto-captured or added manually."
      />
      <WorkspaceBar />
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 4 }}>
          <StatCard label="Total loot" value={items.length} icon={<InventoryIcon fontSize="small" />} tone="primary" />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <StatCard label="Auto-captured" value={autoCount} icon={<InventoryIcon fontSize="small" />} tone="warning" />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <StatCard label="Manual" value={items.length - autoCount} icon={<InventoryIcon fontSize="small" />} tone="info" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionLabel>Add loot</SectionLabel>
          <Panel>
            <Stack spacing={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                >
                  {KINDS.map((k) => (
                    <MenuItem key={k} value={k}>
                      {k}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Value"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                fullWidth
                multiline
                rows={2}
                size="small"
              />
              <TextField
                label="Target"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                fullWidth
                size="small"
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={add}
                sx={{ borderRadius: 2 }}
              >
                Store loot
              </Button>
            </Stack>
          </Panel>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <SectionLabel>Vault</SectionLabel>
          <Panel>
            <Stack spacing={1}>
              {items.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No loot yet. Successful brute jobs and attack lab flags appear here automatically.
                </Typography>
              ) : (
                items.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                          <Chip
                            label={item.kind}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                          {item.tags.includes('auto-capture') && (
                            <Typography variant="caption" color="text.secondary">
                              auto-capture
                            </Typography>
                          )}
                        </Stack>
                        <Typography sx={{ fontWeight: 700 }}>{item.title}</Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                        >
                          {item.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.target} · {new Date(item.capturedAt).toLocaleString()}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => remove(item.id)}
                        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                ))
              )}
            </Stack>
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}
