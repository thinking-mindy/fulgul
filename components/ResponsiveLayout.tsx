'use client';

import { useState } from 'react';
import { Box } from '@mui/material';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';
import Topbar from './Topbar';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export default function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <div className="tm-ambient" aria-hidden />
      <Sidebar mobileOpen={mobileOpen} onMobileClose={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flex: '1 1 auto',
          minWidth: 0,
          width: { xs: '100%', md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Topbar onMenuClick={handleDrawerToggle} />
        <Box
          sx={{
            flex: '1 1 auto',
            width: '100%',
            mt: '56px',
            p: { xs: 2, sm: 3, md: 3.5 },
            minHeight: 'calc(100vh - 56px)',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
