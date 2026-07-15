"use client";

import { Button, CircularProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

interface ScanButtonProps {
  onClick: () => void;
  loading: boolean;
  label?: string;
  variant?: 'contained' | 'outlined';
  fullWidth?: boolean;
}

export default function ScanButton({
  onClick,
  loading,
  label = 'Start Scan',
  variant = 'contained',
  fullWidth = false,
}: ScanButtonProps) {
  return (
    <Button
      variant={variant}
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
      onClick={onClick}
      disabled={loading}
      fullWidth={fullWidth}
      size="large"
      sx={{ borderRadius: 2 }}
    >
      {loading ? 'Scanning...' : label}
    </Button>
  );
}

