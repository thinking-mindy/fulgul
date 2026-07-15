'use client';

import { Box, LinearProgress, Typography, alpha } from '@mui/material';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  progress?: number;
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  action?: ReactNode;
}

export default function StatCard({
  label,
  value,
  hint,
  icon,
  progress,
  tone = 'primary',
  action,
}: StatCardProps) {
  return (
    <Box
      sx={{
        p: 2.25,
        height: '100%',
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.25 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Typography>
        {icon && (
          <Box
            sx={{
              color: `${tone}.main`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              borderRadius: 1.5,
              bgcolor: (t) => alpha(t.palette[tone].main, 0.12),
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '1.65rem',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          mb: hint || progress !== undefined ? 0.75 : 0,
        }}
      >
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45, display: 'block' }}>
          {hint}
        </Typography>
      )}
      {progress !== undefined && (
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.max(0, progress))}
          color={tone}
          sx={{ mt: 1.75, height: 4, borderRadius: 99, bgcolor: 'action.hover' }}
        />
      )}
      {action && <Box sx={{ mt: 1.5 }}>{action}</Box>}
    </Box>
  );
}
