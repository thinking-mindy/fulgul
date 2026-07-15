"use client";

import { Typography, Box, LinearProgress } from '@mui/material';
import { ReactNode } from 'react';
import GlassCard from './ui/GlassCard';

interface ResultCardProps {
  title: string;
  value: string | number;
  subtitle?: string | ReactNode;
  progress?: number;
  status?: 'success' | 'warning' | 'error' | 'info' | 'primary';
  icon?: ReactNode;
  action?: ReactNode;
}

export default function ResultCard({
  title,
  value,
  subtitle,
  progress,
  status = 'primary',
  icon,
  action,
}: ResultCardProps) {
  return (
    <GlassCard>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em' }}>
          {title}
        </Typography>
        {icon && (
          <Box sx={{ color: `${status}.main`, opacity: 0.9 }}>{icon}</Box>
        )}
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em', mb: subtitle ? 0.75 : 0 }}>
        {value}
      </Typography>
      {subtitle && (
        <Box sx={{ mb: progress !== undefined ? 1.5 : 0 }}>
          {typeof subtitle === 'string' ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : (
            subtitle
          )}
        </Box>
      )}
      {progress !== undefined && (
        <LinearProgress
          variant="determinate"
          value={progress}
          color={status === 'primary' ? 'primary' : status}
          sx={{ height: 6, borderRadius: 99, bgcolor: 'action.hover' }}
        />
      )}
      {action && <Box sx={{ mt: 2 }}>{action}</Box>}
    </GlassCard>
  );
}
