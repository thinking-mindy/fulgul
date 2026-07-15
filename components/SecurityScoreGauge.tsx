"use client";

import { Box, Typography, CircularProgress } from '@mui/material';

interface SecurityScoreGaugeProps {
  score: number;
  grade: string | undefined;
  compact?: boolean;
}

export default function SecurityScoreGauge({ score, grade, compact = false }: SecurityScoreGaugeProps) {
  const safeScore = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;

  const getColor = () => {
    if (safeScore >= 90) return 'success';
    if (safeScore >= 70) return 'info';
    if (safeScore >= 50) return 'warning';
    return 'error';
  };

  const getGradeColor = () => {
    if (!grade) return 'text.secondary';
    const normalized = grade.toLowerCase();
    if (normalized === 'excellent') return 'success.main';
    if (normalized === 'good') return 'info.main';
    if (normalized === 'moderate') return 'warning.main';
    if (normalized === 'risky') return 'error.main';
    return 'error.main';
  };

  const size = compact ? 120 : 200;
  const thickness = compact ? 5 : 4;

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: compact ? 1 : 2 }}>
        <CircularProgress
          variant="determinate"
          value={safeScore}
          size={size}
          thickness={thickness}
          sx={{
            color: `${getColor()}.main`,
            transform: 'rotate(-90deg)',
            bgcolor: compact ? 'action.hover' : undefined,
            borderRadius: '50%',
          }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant={compact ? 'h4' : 'h2'}
            component="div"
            sx={{ fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}
          >
            {safeScore}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            / 100
          </Typography>
        </Box>
      </Box>
      <Typography
        variant={compact ? 'subtitle2' : 'h5'}
        sx={{
          fontWeight: 700,
          color: getGradeColor(),
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {grade || 'Unknown'}
      </Typography>
    </Box>
  );
}
