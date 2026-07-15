'use client';

import { Box, LinearProgress, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import GlassCard from './GlassCard';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  progress?: number;
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  action?: ReactNode;
}

const toneMap = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
} as const;

export default function StatCard({
  label,
  value,
  hint,
  icon,
  progress,
  tone = 'primary',
  action,
}: StatCardProps) {
  const color = toneMap[tone];

  return (
    <GlassCard>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.4 }}
        >
          {label}
        </Typography>
        {icon && (
          <Box
            sx={{
              color: `${color}.main`,
              opacity: 0.9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: (theme) => `${theme.palette[color].main}18`,
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
      <Typography
        variant="h3"
        sx={{
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          mb: hint ? 0.75 : progress !== undefined ? 1.5 : 0,
        }}
      >
        {value}
      </Typography>
      {hint && (
        <Typography variant="body2" color="text.secondary">
          {hint}
        </Typography>
      )}
      {progress !== undefined && (
        <LinearProgress
          variant="determinate"
          value={Math.min(100, Math.max(0, progress))}
          color={color}
          sx={{ mt: 2, height: 6, borderRadius: 99, bgcolor: 'action.hover' }}
        />
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </GlassCard>
  );
}
