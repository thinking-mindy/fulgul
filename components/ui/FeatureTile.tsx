'use client';

import { Box, Button, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import type { ReactNode } from 'react';
import GlassCard from './GlassCard';

interface FeatureTileProps {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  tag?: string;
}

export default function FeatureTile({ title, description, icon, onClick, tag }: FeatureTileProps) {
  return (
    <GlassCard onClick={onClick} highlight={false}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
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
        {tag && (
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {tag}
          </Typography>
        )}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.75, letterSpacing: '-0.02em' }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
        {description}
      </Typography>
      <Button
        size="small"
        endIcon={<ArrowForwardIcon />}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        sx={{ px: 0, '&:hover': { bgcolor: 'transparent' } }}
      >
        Open
      </Button>
    </GlassCard>
  );
}
