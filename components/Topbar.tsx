"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Badge,
  useMediaQuery,
  useTheme,
  TextField,
  InputAdornment,
  Avatar,
  Menu,
  MenuItem,
  Typography,
  Divider,
  Chip,
  Stack,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import SecurityIcon from '@mui/icons-material/Security';
import { alpha } from '@mui/material/styles';
import { invoke } from '@tauri-apps/api/core';
import { useSecurityOverview, formatTimeAgo } from '../hooks/useSecurityOverview';
import type { SearchHit } from '../types/tauri';

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { overview } = useSecurityOverview(60000);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const hits = await invoke<SearchHit[]>('search_security_data', {
          query: searchQuery.trim(),
        });
        setSearchResults(hits);
        setSearchOpen(hits.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchor(null);
  };

  const notifications = [
    ...overview.recentVulnerabilities.slice(0, 3).map((v) => ({
      id: v.id,
      title: v.title,
      time: formatTimeAgo(v.detectedAt),
      type: v.severity === 'critical' || v.severity === 'high' ? 'error' : 'warning',
    })),
    ...(overview.recentScans[0]
      ? [{
          id: overview.recentScans[0].scanId,
          title: `Scan complete — score ${overview.recentScans[0].securityScore}`,
          time: formatTimeAgo(overview.recentScans[0].timestamp),
          type: overview.recentScans[0].securityScore >= 70 ? 'success' : 'info',
        }]
      : []),
  ].slice(0, 5);

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { xs: '100%', md: 'calc(100% - 280px)' },
        ml: { xs: 0, md: '280px' },
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        transition: 'margin-left 0.3s ease, width 0.3s ease',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 }, minHeight: '70px !important' }}>
        {isMobile && (
          <IconButton
            color="inherit"
            edge="start"
            onClick={onMenuClick}
            sx={{
              mr: 2,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Search Bar */}
        <Box
          ref={searchRef}
          sx={{
            position: 'relative',
            width: { xs: '100%', sm: 'auto' },
            maxWidth: { xs: '100%', sm: 400 },
            mr: { xs: 0, sm: 2 },
          }}
        >
          <TextField
            size="small"
            hiddenLabel
            placeholder="Search threats, vulnerabilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {searching ? (
                    <CircularProgress size={18} />
                  ) : (
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  )}
                </InputAdornment>
              ),
            }}
          />
          {searchOpen && searchResults.length > 0 && (
            <Paper
              elevation={8}
              sx={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0,
                right: 0,
                zIndex: 1300,
                maxHeight: 320,
                overflow: 'auto',
              }}
            >
              <List dense disablePadding>
                {searchResults.map((hit) => (
                  <ListItemButton
                    key={`${hit.kind}-${hit.id}`}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                      router.push(hit.path);
                    }}
                  >
                    <ListItemText
                      primary={hit.title}
                      secondary={`${hit.kind} · ${hit.subtitle}`}
                      primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {!isMobile && (
            <Chip
              label={overview.totalScans > 0 ? `Score ${overview.averageScore}` : 'No scans'}
              size="small"
              color={
                overview.totalScans === 0
                  ? 'default'
                  : overview.averageScore >= 70
                    ? 'success'
                    : overview.averageScore >= 50
                      ? 'warning'
                      : 'error'
              }
              sx={{ fontWeight: 700, mr: 0.5 }}
            />
          )}
          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={handleNotificationMenuOpen}
            sx={{
              position: 'relative',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <Badge
              badgeContent={notifications.length || undefined}
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%, 100%': {
                      transform: 'scale(1)',
                    },
                    '50%': {
                      transform: 'scale(1.1)',
                    },
                  },
                },
              }}
            >
              <NotificationsIcon />
            </Badge>
          </IconButton>

          {/* Notification Menu */}
          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={handleNotificationMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 320,
                maxHeight: 400,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: (theme) =>
                  `0 8px 24px ${alpha(theme.palette.common.black, 0.15)}`,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ p: 2, pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Notifications
              </Typography>
            </Box>
            <Divider />
            {notifications.length === 0 ? (
              <MenuItem disabled>
                <Typography variant="body2" color="text.secondary">
                  No recent activity
                </Typography>
              </MenuItem>
            ) : notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={handleNotificationMenuClose}
                sx={{
                  py: 1.5,
                  px: 2,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: `${getNotificationColor(notification.type)}.main`,
                    }}
                  >
                    <SecurityIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {notification.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notification.time}
                    </Typography>
                  </Box>
                  <Chip
                    label={notification.type}
                    size="small"
                    color={getNotificationColor(notification.type) as any}
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                </Box>
              </MenuItem>
            ))}
          </Menu>

          {/* Profile Menu */}
          <IconButton
            onClick={handleProfileMenuOpen}
            sx={{
              p: 0.5,
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                border: '2px solid',
                borderColor: 'divider',
              }}
            >
              <AccountCircleIcon />
            </Avatar>
          </IconButton>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 200,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: (theme) =>
                  `0 8px 24px ${alpha(theme.palette.common.black, 0.15)}`,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ p: 2, pb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Free
              </Typography>
              <Typography variant="caption" color="text.secondary">
                freetrial@thinkingminds.co.zw
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={handleProfileMenuClose}
              sx={{
                py: 1.5,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <SettingsIcon sx={{ mr: 2, fontSize: 20 }} />
              Settings
            </MenuItem>
            <MenuItem
              onClick={handleProfileMenuClose}
              sx={{
                py: 1.5,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <SecurityIcon sx={{ mr: 2, fontSize: 20 }} />
              Security
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={handleProfileMenuClose}
              sx={{
                py: 1.5,
                color: 'error.main',
                '&:hover': {
                  bgcolor: 'error.dark',
                  color: 'error.contrastText',
                },
              }}
            >
              <LogoutIcon sx={{ mr: 2, fontSize: 20 }} />
              Logout
            </MenuItem>
          </Menu>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
