"use client";

import { useState, useEffect } from 'react';
import { Box, TextField, Button, Stack, Chip, Typography, alpha } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import SaveIcon from '@mui/icons-material/Save';
import { invoke } from '@tauri-apps/api/core';
import type { DefenseWorkspace } from '../../types/tauri';

interface DefenseWorkspaceBarProps {
  onUpdate?: (ws: DefenseWorkspace) => void;
}

export default function DefenseWorkspaceBar({ onUpdate }: DefenseWorkspaceBarProps) {
  const [asset, setAsset] = useState('');
  const [engagement, setEngagement] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoke<DefenseWorkspace>('get_defense_workspace').then((ws) => {
      setAsset(ws.primaryAsset);
      setEngagement(ws.engagementId ?? null);
      onUpdate?.(ws);
    }).catch(() => {});
  }, [onUpdate]);

  const save = async () => {
    setSaving(true);
    try {
      const ws = await invoke<DefenseWorkspace>('set_defense_primary_asset', { asset });
      onUpdate?.(ws);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        p: 1.5,
        mb: 3,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        background: (t) => `linear-gradient(90deg, ${alpha(t.palette.success.main, 0.08)} 0%, transparent 100%)`,
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 150 }}>
          <ShieldIcon color="success" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={700}>Protected asset</Typography>
        </Stack>
        <TextField
          size="small"
          fullWidth
          placeholder="prod-db-01 · 10.0.1.0/24 · localhost"
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <Button variant="contained" color="success" size="small" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
          Sync
        </Button>
        {engagement && <Chip label="Engagement linked" size="small" color="success" variant="outlined" />}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Shared across scans, vulnerability tracking, hardening, and response workflows.
      </Typography>
    </Box>
  );
}
