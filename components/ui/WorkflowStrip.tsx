'use client';

import { Box, Typography } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import RadarIcon from '@mui/icons-material/Radar';
import ShieldIcon from '@mui/icons-material/Shield';
import type { ReactNode } from 'react';

const steps: { key: string; label: string; desc: string; icon: ReactNode }[] = [
  {
    key: 'attack',
    label: 'Attack',
    desc: 'Live attack labs against targets you control',
    icon: <GavelIcon fontSize="small" />,
  },
  {
    key: 'detect',
    label: 'Detect',
    desc: 'Scan local and remote surfaces for risk',
    icon: <RadarIcon fontSize="small" />,
  },
  {
    key: 'respond',
    label: 'Respond',
    desc: 'Harden, patch, and automate remediation',
    icon: <ShieldIcon fontSize="small" />,
  },
];

export default function WorkflowStrip() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        gap: 0,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2.5,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        boxShadow: 'var(--tm-shadow)',
      }}
    >
      {steps.map((step, i) => (
        <Box
          key={step.key}
          sx={{
            p: 2.5,
            borderRight: { md: i < steps.length - 1 ? '1px solid' : 'none' },
            borderBottom: { xs: i < steps.length - 1 ? '1px solid' : 'none', md: 'none' },
            borderColor: 'divider',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              bgcolor: i === 0 ? 'primary.main' : 'transparent',
              opacity: 0.8,
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              {step.icon}
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: '0.02em' }}>
              {step.label}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
            {step.desc}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
