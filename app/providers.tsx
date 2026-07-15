"use client";

import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { CssBaseline } from '@mui/material';
import AppTheme from '../src/shared-theme/AppTheme';

type Props = {
  children: React.ReactNode;
};

export default function Providers({ children }: Props) {
  return (
    <AppRouterCacheProvider>
      <AppTheme>
        <CssBaseline />
        {children}
      </AppTheme>
    </AppRouterCacheProvider>
  );
}

