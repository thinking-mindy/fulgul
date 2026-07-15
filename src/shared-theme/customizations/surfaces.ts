import { alpha, Theme, Components } from '@mui/material/styles';
import { brand } from '../themePrimitives';

/* eslint-disable import/prefer-default-export */
export const surfacesCustomizations: Components<Theme> = {
  MuiAccordion: {
    defaultProps: {
      elevation: 0,
      disableGutters: true,
    },
    styleOverrides: {
      root: ({ theme }) => ({
        padding: 4,
        overflow: 'clip',
        backgroundColor: theme.palette.background.paper,
        border: '1px solid',
        borderColor: theme.palette.divider,
        ':before': {
          backgroundColor: 'transparent',
        },
        '&:not(:last-of-type)': {
          borderBottom: 'none',
        },
        '&:first-of-type': {
          borderTopLeftRadius: theme.shape.borderRadius,
          borderTopRightRadius: theme.shape.borderRadius,
        },
        '&:last-of-type': {
          borderBottomLeftRadius: theme.shape.borderRadius,
          borderBottomRightRadius: theme.shape.borderRadius,
        },
      }),
    },
  },
  MuiAccordionSummary: {
    styleOverrides: {
      root: ({ theme }) => ({
        border: 'none',
        borderRadius: 8,
        '&:hover': { backgroundColor: alpha(brand[500], 0.06) },
        '&:focus-visible': { backgroundColor: 'transparent' },
      }),
    },
  },
  MuiAccordionDetails: {
    styleOverrides: {
      root: { mb: 20, border: 'none' },
    },
  },
  MuiPaper: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${alpha(brand[500], 0.12)}`,
        backgroundColor: theme.palette.background.paper,
        boxShadow: '0 4px 24px hsla(0, 0%, 0%, 0.35)',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }),
    },
  },
  MuiCard: {
    styleOverrides: {
      root: ({ theme }) => ({
        gap: 16,
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${alpha(brand[500], 0.12)}`,
        backgroundColor: theme.palette.background.paper,
        boxShadow: '0 4px 24px hsla(0, 0%, 0%, 0.35)',
        transition: 'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
      }),
    },
  },
  MuiCardContent: {
    styleOverrides: {
      root: {
        padding: 20,
        '&:last-child': { paddingBottom: 20 },
      },
    },
  },
  MuiCardHeader: {
    styleOverrides: {
      root: {
        padding: 20,
        paddingBottom: 0,
      },
    },
  },
  MuiCardActions: {
    styleOverrides: {
      root: {
        padding: 20,
        paddingTop: 0,
      },
    },
  },
};
