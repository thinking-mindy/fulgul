'use client';

import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  subtitle?: string;
  /** @deprecated Prefer quieter headers — chips are no longer rendered. */
  chips?: string[];
  actions?: ReactNode;
}

export default function PageHeader({
  eyebrow,
  title,
  titleAccent,
  subtitle,
  actions,
}: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'flex-end' },
        flexDirection: { xs: 'column', sm: 'row' },
        flexWrap: 'wrap',
        gap: 2,
        mb: 3.5,
        width: '100%',
      }}
    >
      <Box sx={{ maxWidth: 640 }}>
        {eyebrow && (
          <Typography
            variant="overline"
            sx={{
              color: 'primary.main',
              fontWeight: 700,
              letterSpacing: '0.14em',
              display: 'block',
              mb: 1,
            }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography
          component="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.75rem', md: '2.15rem' },
            lineHeight: 1.12,
            letterSpacing: '-0.04em',
            mb: subtitle ? 1 : 0,
          }}
        >
          {title}
          {titleAccent ? (
            <Box component="span" sx={{ color: 'primary.main' }}>
              {' '}
              {titleAccent}
            </Box>
          ) : null}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.65, maxWidth: 480 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
          {actions}
        </Stack>
      )}
    </Box>
  );
}
