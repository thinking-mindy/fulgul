'use client';

import { Card, CardContent, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  sx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
  onClick?: () => void;
  highlight?: boolean;
  noPadding?: boolean;
}

export default function GlassCard({
  children,
  sx,
  contentSx,
  onClick,
  highlight = false,
  noPadding = false,
}: GlassCardProps) {
  return (
    <Card
      onClick={onClick}
      elevation={0}
      sx={{
        height: '100%',
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: highlight ? 'primary.main' : 'divider',
        borderRadius: 2.5,
        boxShadow: 'none',
        transition: 'border-color 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick
          ? {
              borderColor: 'primary.main',
              transform: 'translateY(-2px)',
            }
          : undefined,
        ...sx,
      }}
    >
      <CardContent sx={{ p: noPadding ? 0 : 2.5, '&:last-child': { pb: noPadding ? 0 : 2.5 }, ...contentSx }}>
        {children}
      </CardContent>
    </Card>
  );
}
