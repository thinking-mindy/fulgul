"use client";

import { useState } from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';
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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <div className="tm-ambient" aria-hidden />
      <Sidebar mobileOpen={mobileOpen} onMobileClose={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%' },
          position: 'relative',
          zIndex: 1,
          transition: 'margin-left 0.3s ease',
        }}
      >
        <Topbar onMenuClick={handleDrawerToggle} />
        <Box
          sx={{
            mt: { xs: '70px', md: '70px' },
            p: { xs: 2, sm: 3, md: 4 },
            maxWidth: 1440,
            mx: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
