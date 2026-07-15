import * as React from 'react';
import { alpha, Theme, Components } from '@mui/material/styles';
import { svgIconClasses } from '@mui/material/SvgIcon';
import { toggleButtonGroupClasses } from '@mui/material/ToggleButtonGroup';
import { toggleButtonClasses } from '@mui/material/ToggleButton';
import CheckBoxOutlineBlankRoundedIcon from '@mui/icons-material/CheckBoxOutlineBlankRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import { gray, brand } from '../themePrimitives';

/* eslint-disable import/prefer-default-export */
export const inputsCustomizations: Components<Theme> = {
  MuiButtonBase: {
    defaultProps: {
      disableTouchRipple: true,
      disableRipple: true,
    },
    styleOverrides: {
      root: ({ theme }) => ({
        boxSizing: 'border-box',
        transition: 'all 100ms ease-in',
        '&:focus-visible': {
          outline: `3px solid ${alpha(theme.palette.primary.main, 0.5)}`,
          outlineOffset: '2px',
        },
      }),
    },
  },
  MuiButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        boxShadow: 'none',
        borderRadius: theme.shape.borderRadius,
        textTransform: 'none',
        variants: [
          {
            props: {
              size: 'small',
            },
            style: {
              height: '2.25rem',
              padding: '8px 12px',
            },
          },
          {
            props: {
              size: 'medium',
            },
            style: {
              height: '2.5rem', // 40px
            },
          },
          {
            props: {
              color: 'primary',
              variant: 'contained',
            },
            style: {
              color: '#ffffff',
              backgroundColor: brand[500],
              backgroundImage: 'none',
              boxShadow: 'none',
              border: `1px solid ${brand[600]}`,
              '&:hover': {
                backgroundColor: brand[600],
                backgroundImage: 'none',
                boxShadow: 'none',
              },
              '&:active': {
                backgroundColor: brand[700],
                backgroundImage: 'none',
                boxShadow: 'none',
              },
              ...theme.applyStyles('dark', {
                color: '#ffffff',
                backgroundColor: brand[500],
                backgroundImage: 'none',
                boxShadow: 'none',
                border: `1px solid ${brand[600]}`,
                '&:hover': {
                  backgroundColor: brand[600],
                  backgroundImage: 'none',
                  boxShadow: 'none',
                },
                '&:active': {
                  backgroundColor: brand[700],
                  backgroundImage: 'none',
                  boxShadow: 'none',
                },
              }),
            },
          },
          {
            props: {
              color: 'secondary',
              variant: 'contained',
            },
            style: {
              color: '#ffffff',
              backgroundColor: brand[600],
              backgroundImage: 'none',
              boxShadow: 'none',
              border: `1px solid ${brand[700]}`,
              '&:hover': {
                backgroundColor: brand[700],
                backgroundImage: 'none',
                boxShadow: 'none',
              },
              '&:active': {
                backgroundColor: brand[800],
                backgroundImage: 'none',
                boxShadow: 'none',
              },
              ...theme.applyStyles('dark', {
                color: '#ffffff',
                backgroundColor: brand[600],
                backgroundImage: 'none',
                boxShadow: 'none',
                border: `1px solid ${brand[700]}`,
                '&:hover': {
                  backgroundColor: brand[700],
                  backgroundImage: 'none',
                  boxShadow: 'none',
                },
                '&:active': {
                  backgroundColor: brand[800],
                  backgroundImage: 'none',
                  boxShadow: 'none',
                },
              }),
            },
          },
          {
            props: {
              variant: 'outlined',
            },
            style: {
              color: theme.palette.text.primary,
              border: '1px solid',
              borderColor: gray[200],
              backgroundColor: alpha(gray[50], 0.3),
              '&:hover': {
                backgroundColor: gray[100],
                borderColor: gray[300],
              },
              '&:active': {
                backgroundColor: gray[200],
              },
              ...theme.applyStyles('dark', {
                backgroundColor: gray[800],
                borderColor: gray[700],

                '&:hover': {
                  backgroundColor: gray[900],
                  borderColor: gray[600],
                },
                '&:active': {
                  backgroundColor: gray[900],
                },
              }),
            },
          },
          {
            props: {
              color: 'primary',
              variant: 'outlined',
            },
            style: {
              color: brand[700], // Darker green (thinking)
              border: '1px solid',
              borderColor: brand[400],
              backgroundColor: alpha(brand[50], 0.5),
              '&:hover': {
                backgroundColor: alpha(brand[100], 0.7),
                borderColor: brand[500], // Vibrant green (minds.)
                color: brand[600],
              },
              '&:active': {
                backgroundColor: alpha(brand[200], 0.8),
                borderColor: brand[600],
              },
              ...theme.applyStyles('dark', {
                color: brand[300],
                border: '1px solid',
                borderColor: brand[600],
                backgroundColor: alpha(brand[900], 0.3),
                '&:hover': {
                  borderColor: brand[500],
                  backgroundColor: alpha(brand[800], 0.5),
                  color: brand[200],
                },
                '&:active': {
                  backgroundColor: alpha(brand[800], 0.7),
                  borderColor: brand[400],
                },
              }),
            },
          },
          {
            props: {
              color: 'secondary',
              variant: 'outlined',
            },
            style: {
              color: brand[700],
              border: '1px solid',
              borderColor: brand[200],
              backgroundColor: brand[50],
              '&:hover': {
                backgroundColor: brand[100],
                borderColor: brand[400],
              },
              '&:active': {
                backgroundColor: alpha(brand[200], 0.7),
              },
              ...theme.applyStyles('dark', {
                color: brand[50],
                border: '1px solid',
                borderColor: brand[900],
                backgroundColor: alpha(brand[900], 0.3),
                '&:hover': {
                  borderColor: brand[700],
                  backgroundColor: alpha(brand[900], 0.6),
                },
                '&:active': {
                  backgroundColor: alpha(brand[900], 0.5),
                },
              }),
            },
          },
          {
            props: {
              variant: 'text',
            },
            style: {
              color: gray[600],
              '&:hover': {
                backgroundColor: gray[100],
              },
              '&:active': {
                backgroundColor: gray[200],
              },
              ...theme.applyStyles('dark', {
                color: gray[50],
                '&:hover': {
                  backgroundColor: gray[700],
                },
                '&:active': {
                  backgroundColor: alpha(gray[700], 0.7),
                },
              }),
            },
          },
          {
            props: {
              color: 'primary',
              variant: 'text',
            },
            style: {
              color: brand[700], // Darker green (thinking)
              '&:hover': {
                backgroundColor: alpha(brand[100], 0.6),
                color: brand[600],
              },
              '&:active': {
                backgroundColor: alpha(brand[200], 0.8),
                color: brand[500], // Vibrant green (minds.)
              },
              ...theme.applyStyles('dark', {
                color: brand[300],
                '&:hover': {
                  backgroundColor: alpha(brand[900], 0.5),
                  color: brand[200],
                },
                '&:active': {
                  backgroundColor: alpha(brand[800], 0.7),
                  color: brand[100],
                },
              }),
            },
          },
          {
            props: {
              color: 'secondary',
              variant: 'text',
            },
            style: {
              color: brand[700],
              '&:hover': {
                backgroundColor: alpha(brand[100], 0.5),
              },
              '&:active': {
                backgroundColor: alpha(brand[200], 0.7),
              },
              ...theme.applyStyles('dark', {
                color: brand[100],
                '&:hover': {
                  backgroundColor: alpha(brand[900], 0.5),
                },
                '&:active': {
                  backgroundColor: alpha(brand[900], 0.3),
                },
              }),
            },
          },
        ],
      }),
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        boxShadow: 'none',
        borderRadius: theme.shape.borderRadius,
        textTransform: 'none',
        fontWeight: theme.typography.fontWeightMedium,
        letterSpacing: 0,
        color: theme.palette.text.primary,
        border: '1px solid ',
        borderColor: gray[200],
        backgroundColor: alpha(gray[50], 0.3),
        '&:hover': {
          backgroundColor: gray[100],
          borderColor: gray[300],
        },
        '&:active': {
          backgroundColor: gray[200],
        },
        ...theme.applyStyles('dark', {
          backgroundColor: gray[800],
          borderColor: gray[700],
          '&:hover': {
            backgroundColor: gray[900],
            borderColor: gray[600],
          },
          '&:active': {
            backgroundColor: gray[900],
          },
        }),
        variants: [
          {
            props: {
              color: 'primary',
            },
            style: {
              color: brand[700],
              borderColor: alpha(brand[400], 0.5),
              backgroundColor: alpha(brand[50], 0.4),
              '&:hover': {
                backgroundColor: alpha(brand[100], 0.7),
                borderColor: brand[500],
                color: brand[600],
              },
              '&:active': {
                backgroundColor: alpha(brand[200], 0.8),
                borderColor: brand[600],
              },
              ...theme.applyStyles('dark', {
                color: brand[300],
                borderColor: alpha(brand[600], 0.5),
                backgroundColor: alpha(brand[900], 0.3),
                '&:hover': {
                  backgroundColor: alpha(brand[800], 0.5),
                  borderColor: brand[500],
                  color: brand[200],
                },
                '&:active': {
                  backgroundColor: alpha(brand[800], 0.7),
                  borderColor: brand[400],
                },
              }),
            },
          },
          {
            props: {
              size: 'small',
            },
            style: {
              width: '2.25rem',
              height: '2.25rem',
              padding: '0.25rem',
              [`& .${svgIconClasses.root}`]: { fontSize: '1rem' },
            },
          },
          {
            props: {
              size: 'medium',
            },
            style: {
              width: '2.5rem',
              height: '2.5rem',
            },
          },
        ],
      }),
    },
  },
  MuiToggleButtonGroup: {
    styleOverrides: {
      root: ({ theme }) => ({
        borderRadius: '10px',
        boxShadow: 'none',
        [`& .${toggleButtonGroupClasses.selected}`]: {
          color: brand[500],
        },
        ...theme.applyStyles('dark', {
          [`& .${toggleButtonGroupClasses.selected}`]: {
            color: '#fff',
          },
          boxShadow: 'none',
        }),
      }),
    },
  },
  MuiToggleButton: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: '12px 16px',
        textTransform: 'none',
        borderRadius: '10px',
        fontWeight: 500,
        ...theme.applyStyles('dark', {
          color: gray[400],
          boxShadow: 'none',
          [`&.${toggleButtonClasses.selected}`]: {
            color: brand[300],
          },
        }),
      }),
    },
  },
  MuiCheckbox: {
    defaultProps: {
      disableRipple: true,
      icon: (
        <CheckBoxOutlineBlankRoundedIcon sx={{ color: 'hsla(210, 0%, 0%, 0.0)' }} />
      ),
      checkedIcon: <CheckRoundedIcon sx={{ height: 14, width: 14 }} />,
      indeterminateIcon: <RemoveRoundedIcon sx={{ height: 14, width: 14 }} />,
    },
    styleOverrides: {
      root: ({ theme }) => ({
        margin: 10,
        height: 16,
        width: 16,
        borderRadius: 5,
        border: '1px solid ',
        borderColor: alpha(gray[300], 0.8),
        boxShadow: '0 0 0 1.5px hsla(210, 0%, 0%, 0.04) inset',
        backgroundColor: alpha(gray[100], 0.4),
        transition: 'border-color, background-color, 120ms ease-in',
        '&:hover': {
          borderColor: brand[300],
        },
        '&.Mui-focusVisible': {
          outline: `3px solid ${alpha(brand[500], 0.5)}`,
          outlineOffset: '2px',
          borderColor: brand[400],
        },
        '&.Mui-checked': {
          color: 'white',
          backgroundColor: brand[500],
          borderColor: brand[500],
          boxShadow: `none`,
          '&:hover': {
            backgroundColor: brand[600],
          },
        },
        ...theme.applyStyles('dark', {
          borderColor: alpha(gray[700], 0.8),
          boxShadow: '0 0 0 1.5px hsl(210, 0%, 0%) inset',
          backgroundColor: alpha(gray[900], 0.8),
          '&:hover': {
            borderColor: brand[300],
          },
          '&.Mui-focusVisible': {
            borderColor: brand[400],
            outline: `3px solid ${alpha(brand[500], 0.5)}`,
            outlineOffset: '2px',
          },
        }),
      }),
    },
  },
  MuiTextField: {
    defaultProps: {
      variant: 'filled',
    },
  },
  MuiSelect: {
    defaultProps: {
      variant: 'filled',
    },
  },
  MuiFormControl: {
    defaultProps: {
      variant: 'filled',
    },
  },
};
