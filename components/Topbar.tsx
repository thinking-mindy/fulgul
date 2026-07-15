'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  Menu,
  MenuItem,
  Typography,
  Divider,
  Stack,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  alpha,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import { invoke } from '@tauri-apps/api/core';
import { SIDEBAR_WIDTH } from './Sidebar';
import { useSecurityOverview, formatTimeAgo } from '../hooks/useSecurityOverview';
import type { SearchHit } from '../types/tauri';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/terminal': 'Security Shell',
  '/blue-team': 'Blue Team',
  '/red-team': 'Red Team',
  '/defense-scope': 'Assets',
  '/scan-local': 'Local Scan',
  '/scan-remote': 'Remote Scan',
  '/scan-history': 'Scan History',
  '/vulnerabilities': 'Findings',
  '/risk-posture': 'Risk Analysis',
  '/hardening': 'Harden',
  '/response': 'Response',
  '/reports': 'Reports',
  '/defensive': 'Defensive Hub',
  '/engagement': 'Engagement',
  '/recon': 'Recon',
  '/enumerate': 'Enumerate',
  '/attacks': 'Attack Lab',
  '/credentials': 'Credentials',
  '/loot': 'Loot',
  '/offensive': 'Offensive Hub',
  '/support': 'Support',
};

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { overview } = useSecurityOverview(60000);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchHit[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const title = pageTitles[pathname] ?? 'Fulgul';

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

  const notifications = [
    ...overview.recentVulnerabilities.slice(0, 3).map((v) => ({
      id: v.id,
      title: v.title,
      time: formatTimeAgo(v.detectedAt),
      tone: v.severity === 'critical' || v.severity === 'high' ? 'error.main' : 'warning.main',
    })),
    ...(overview.recentScans[0]
      ? [
          {
            id: overview.recentScans[0].scanId,
            title: `Scan complete — score ${overview.recentScans[0].securityScore}`,
            time: formatTimeAgo(overview.recentScans[0].timestamp),
            tone: overview.recentScans[0].securityScore >= 70 ? 'success.main' : 'text.secondary',
          },
        ]
      : []),
  ].slice(0, 5);

  const scoreLabel =
    overview.totalScans > 0 ? `Score ${overview.averageScore}` : 'No scans yet';
  const scoreColor =
    overview.totalScans === 0
      ? 'text.secondary'
      : overview.averageScore >= 70
        ? 'success.main'
        : overview.averageScore >= 50
          ? 'warning.main'
          : 'error.main';

  const iconBtnSx = {
    width: 34,
    height: 34,
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 2,
    color: 'text.secondary',
    '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main', color: 'primary.main' },
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { xs: '100%', md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        ml: { xs: 0, md: `${SIDEBAR_WIDTH}px` },
        bgcolor: (t) => alpha(t.palette.background.paper, 0.85),
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        backdropFilter: 'blur(12px)',
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          px: { xs: 1.5, sm: 2.5 },
          minHeight: '56px !important',
          gap: 1.5,
        }}
      >
        {isMobile && (
          <IconButton onClick={onMenuClick} sx={iconBtnSx} size="small">
            <MenuIcon fontSize="small" />
          </IconButton>
        )}

        {!isMobile && (
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: '-0.02em',
              minWidth: 120,
              mr: 1,
            }}
            noWrap
          >
            {title}
          </Typography>
        )}

        <Box
          ref={searchRef}
          sx={{
            position: 'relative',
            flex: { xs: 1, sm: '0 1 320px' },
            maxWidth: 360,
          }}
        >
          <TextField
            size="small"
            hiddenLabel
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {searching ? (
                    <CircularProgress size={14} />
                  ) : (
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                  )}
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: (t) => alpha(t.palette.background.default, 0.5),
                '& fieldset': { borderColor: 'divider' },
                '&:hover fieldset': { borderColor: 'divider' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1 },
              },
              '& .MuiInputBase-input': { py: 0.9, fontSize: '0.85rem' },
            }}
          />
          {searchOpen && searchResults.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                zIndex: 1300,
                maxHeight: 280,
                overflow: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
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
                    sx={{ py: 1, px: 1.5 }}
                  >
                    <ListItemText
                      primary={hit.title}
                      secondary={`${hit.kind} · ${hit.subtitle}`}
                      primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }}
                      secondaryTypographyProps={{ fontSize: '0.7rem' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1} alignItems="center">
          {!isMobile && (
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: scoreColor, letterSpacing: '0.02em', mr: 0.5 }}
            >
              {scoreLabel}
            </Typography>
          )}

          <IconButton
            size="small"
            onClick={(e) => setNotificationAnchor(e.currentTarget)}
            sx={iconBtnSx}
          >
            <Badge
              badgeContent={notifications.length || undefined}
              color="error"
              sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}
            >
              <NotificationsIcon sx={{ fontSize: 18 }} />
            </Badge>
          </IconButton>

          <IconButton size="small" onClick={() => router.push('/support')} sx={iconBtnSx}>
            <LocalCafeIcon sx={{ fontSize: 17, color: '#f59e0b' }} />
          </IconButton>
        </Stack>

        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={() => setNotificationAnchor(null)}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1.25,
              minWidth: 300,
              maxWidth: 360,
              maxHeight: 360,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2.5,
              boxShadow: 'none',
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>Activity</Typography>
          </Box>
          <Divider />
          {notifications.length === 0 ? (
            <MenuItem disabled sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No recent activity
              </Typography>
            </MenuItem>
          ) : (
            notifications.map((n) => (
              <MenuItem
                key={n.id}
                onClick={() => setNotificationAnchor(null)}
                sx={{ py: 1.25, px: 2, alignItems: 'flex-start' }}
              >
                <Box sx={{ width: '100%' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.35 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: n.tone, flexShrink: 0 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {n.title}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 1.75 }}>
                    {n.time}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          )}
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
