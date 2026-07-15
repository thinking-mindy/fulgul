'use client';

import { Box, Chip, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  subtitle?: string;
  chips?: string[];
  actions?: ReactNode;
}

export default function PageHeader({
  eyebrow,
  title,
  titleAccent,
  subtitle,
  chips,
  actions,
}: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 2,
        mb: 4,
      }}
    >
      <Box sx={{ maxWidth: 720 }}>
        {eyebrow && (
          <Typography
            variant="overline"
            sx={{
              color: 'primary.main',
              fontWeight: 700,
              letterSpacing: '0.12em',
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
            fontSize: { xs: '1.75rem', md: '2.25rem' },
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            mb: subtitle || chips ? 1.25 : 0,
          }}
        >
          {title}
          {titleAccent && (
            <Typography
              component="span"
              sx={{
                display: 'block',
                color: 'primary.main',
                fontWeight: 800,
                fontSize: 'inherit',
                lineHeight: 'inherit',
                letterSpacing: 'inherit',
              }}
            >
              {titleAccent}
            </Typography>
          )}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, lineHeight: 1.6 }}>
            {subtitle}
          </Typography>
        )}
        {chips && chips.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
            {chips.map((chip) => (
              <Chip
                key={chip}
                label={chip}
                size="small"
                variant="outlined"
                sx={{
                  borderColor: 'divider',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  letterSpacing: '0.04em',
                }}
              />
            ))}
          </Stack>
        )}
      </Box>
      {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
    </Box>
  );
}
