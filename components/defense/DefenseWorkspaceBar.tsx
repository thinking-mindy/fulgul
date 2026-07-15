'use client';

import { useState, useEffect } from 'react';
import { Box, TextField, Button, Stack, Typography } from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import SaveIcon from '@mui/icons-material/Save';
import { invoke } from '@tauri-apps/api/core';
import type { DefenseWorkspace } from '../../types/tauri';

interface DefenseWorkspaceBarProps {
  onUpdate?: (ws: DefenseWorkspace) => void;
}

export default function DefenseWorkspaceBar({ onUpdate }: DefenseWorkspaceBarProps) {
  const [asset, setAsset] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoke<DefenseWorkspace>('get_defense_workspace')
      .then((ws) => {
        setAsset(ws.primaryAsset);
        onUpdate?.(ws);
      })
      .catch(() => {});
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
        bgcolor: 'background.paper',
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 130 }}>
          <ShieldIcon color="primary" fontSize="small" />
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Asset
          </Typography>
        </Stack>
        <TextField
          size="small"
          fullWidth
          placeholder="prod-db-01 · 10.0.1.0/24 · localhost"
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={save} disabled={saving} sx={{ borderRadius: 2 }}>
          Sync
        </Button>
      </Stack>
    </Box>
  );
}
