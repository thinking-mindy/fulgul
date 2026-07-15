'use client';

import { Box, Typography } from '@mui/material';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import type { ReactNode } from 'react';
import { Panel } from './SectionLabel';

interface FeatureTileProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  tag?: string;
}

export default function FeatureTile({ title, description, icon, onClick }: FeatureTileProps) {
  return (
    <Panel onClick={onClick}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}
        >
          {icon}
        </Box>
        <NorthEastIcon
          sx={{
            fontSize: 16,
            color: 'text.secondary',
            opacity: 0.35,
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            '.MuiBox-root:hover &': { opacity: 1, transform: 'translate(2px, -2px)' },
          }}
        />
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em', mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55, display: 'block' }}>
        {description}
      </Typography>
    </Panel>
  );
}
