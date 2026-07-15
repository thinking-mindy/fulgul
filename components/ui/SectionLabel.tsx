'use client';

import { Box, Typography, alpha, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
  action?: ReactNode;
}

/** Quiet overline section label used across pages. */
export default function SectionLabel({ children, action }: SectionLabelProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 1.5,
      }}
    >
      <Typography
        variant="overline"
        sx={{ fontWeight: 700, letterSpacing: '0.12em', color: 'text.secondary' }}
      >
        {children}
      </Typography>
      {action}
    </Box>
  );
}

interface PanelProps {
  children: ReactNode;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}

/** Soft bordered panel — preferred over heavy GlassCard stacks. */
export function Panel({ children, onClick, sx }: PanelProps) {
  return (
    <Box
      onClick={onClick}
      sx={[
        {
          p: 2.5,
          height: '100%',
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'border-color 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
          ...(onClick
            ? {
                '&:hover': {
                  borderColor: 'primary.main',
                  transform: 'translateY(-2px)',
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
                },
              }
            : {}),
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  );
}
