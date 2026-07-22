'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
  Avatar,
  alpha,
  Collapse,
  Stack,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SecurityIcon from '@mui/icons-material/Security';
import BuildIcon from '@mui/icons-material/Build';
import BugReportIcon from '@mui/icons-material/BugReport';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import BoltIcon from '@mui/icons-material/Bolt';
import TerminalIcon from '@mui/icons-material/Terminal';
import ShieldIcon from '@mui/icons-material/Shield';
import GavelIcon from '@mui/icons-material/Gavel';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import InventoryIcon from '@mui/icons-material/Inventory';
import HubIcon from '@mui/icons-material/Hub';
import RadarIcon from '@mui/icons-material/Radar';
import LanIcon from '@mui/icons-material/Lan';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { invoke } from '@tauri-apps/api/core';
import type { StoredVulnerability } from '../types/tauri';
import { averageSecurityScore, normalizeScanHistory } from '../lib/scan';

const drawerWidth = 236;
export const SIDEBAR_WIDTH = drawerWidth;

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: 'vulns' | 'pending';
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const primaryNav: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: DashboardIcon },
  { path: '/terminal', label: 'Shell', icon: TerminalIcon },
];

const groups: NavGroup[] = [
  {
    id: 'blue',
    label: 'Blue Team',
    icon: ShieldIcon,
    items: [
      { path: '/blue-team', label: 'Pipeline', icon: HubIcon },
      { path: '/defense-scope', label: 'Assets', icon: AssignmentIcon },
      { path: '/scan-local', label: 'Local Scan', icon: RadarIcon },
      { path: '/scan-remote', label: 'Remote Scan', icon: LanIcon },
      { path: '/vulnerabilities', label: 'Findings', icon: BugReportIcon, badge: 'vulns' },
      { path: '/hardening', label: 'Harden', icon: BuildIcon, badge: 'pending' },
      { path: '/response', label: 'Response', icon: AutoFixHighIcon },
      { path: '/reports', label: 'Reports', icon: AssessmentIcon },
    ],
  },
  {
    id: 'red',
    label: 'Red Team',
    icon: GavelIcon,
    items: [
      { path: '/red-team', label: 'Pipeline', icon: HubIcon },
      { path: '/engagement', label: 'Engagement', icon: AssignmentIcon },
      { path: '/recon', label: 'Recon', icon: TravelExploreIcon },
      { path: '/enumerate', label: 'Enumerate', icon: ManageSearchIcon },
      { path: '/attacks', label: 'Attack Lab', icon: SecurityIcon },
      { path: '/credentials', label: 'Credentials', icon: BoltIcon },
      { path: '/loot', label: 'Loot', icon: InventoryIcon },
      { path: '/offensive', label: 'Overview', icon: GavelIcon },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [counts, setCounts] = useState({ vulns: 0, pending: 0 });
  const [status, setStatus] = useState('Awaiting first scan');
  const [open, setOpen] = useState<Record<string, boolean>>({ blue: true, red: true });

  const activeGroup = useMemo(() => {
    for (const g of groups) {
      if (g.items.some((i) => i.path === pathname)) return g.id;
    }
    return null;
  }, [pathname]);

  // Always expand the section that contains the current route.
  useEffect(() => {
    if (!activeGroup) return;
    setOpen((prev) => (prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }));
  }, [activeGroup]);

  useEffect(() => {
    const load = async () => {
      try {
        const history = normalizeScanHistory(await invoke<unknown[]>('get_scan_history'));
        const allVulns = await invoke<Array<[StoredVulnerability, string]>>('get_all_vulnerabilities');
        const pending = allVulns.filter(([v]) => v.status === 'pending').length;
        const critical = allVulns.filter(
          ([v]) => v.severity.toLowerCase() === 'critical' || v.severity.toLowerCase() === 'high',
        ).length;
        setCounts({ vulns: allVulns.length, pending });
        const score = averageSecurityScore(history);
        setStatus(
          history.length === 0
            ? 'Awaiting first scan'
            : critical > 0
              ? `${critical} critical`
              : score >= 70
                ? 'Posture healthy'
                : 'Review recommended',
        );
      } catch {
        setStatus('Status unavailable');
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [pathname]);

  const go = (path: string) => {
    router.push(path);
    if (isMobile) onMobileClose?.();
  };

  const itemButton = (item: NavItem) => {
    const Icon = item.icon;
    const active = pathname === item.path;
    const badge = item.badge ? counts[item.badge] : 0;

    return (
      <ListItem key={item.path} disablePadding sx={{ mb: 0.15 }}>
        <ListItemButton
          onClick={() => go(item.path)}
          selected={active}
          sx={{
            borderRadius: 2,
            py: 0.7,
            px: 1.25,
            minHeight: 36,
            '&.Mui-selected': {
              bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
              '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.14) },
            },
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: active ? 'primary.main' : 'text.secondary' }}>
            <Icon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{
              fontSize: '0.84rem',
              fontWeight: active ? 700 : 500,
              color: active ? 'primary.main' : 'text.primary',
              noWrap: true,
            }}
          />
          {badge > 0 && (
            <Typography
              component="span"
              sx={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: 'text.secondary',
                minWidth: 18,
                textAlign: 'right',
              }}
            >
              {badge > 99 ? '99+' : badge}
            </Typography>
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  const content = (
    <>
      <Box sx={{ px: 2, pt: 2.25, pb: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Avatar
            variant="rounded"
            sx={{
              width: 36,
              height: 36,
              bgcolor: 'transparent',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Image src="/icon.png" alt="Fulgul" width={36} height={36} priority />
          </Avatar>
          <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>Fulgul</Typography>
        </Stack>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 1,
          py: 1.25,
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: alpha(theme.palette.text.primary, 0.12),
            borderRadius: 4,
          },
        }}
      >
        <List disablePadding sx={{ mb: 1.5 }}>
          {primaryNav.map(itemButton)}
        </List>

        {groups.map((group) => {
          const GroupIcon = group.icon;
          const isOpen = open[group.id] ?? false;
          const inGroup = group.items.some((i) => i.path === pathname);

          return (
            <Box key={group.id} sx={{ mb: 0.75 }}>
              <ListItemButton
                onClick={() => setOpen((p) => ({ ...p, [group.id]: !isOpen }))}
                sx={{
                  borderRadius: 2,
                  py: 0.85,
                  px: 1.25,
                  mb: 0.25,
                  bgcolor: inGroup ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: inGroup ? 'primary.main' : 'text.secondary' }}>
                  <GroupIcon sx={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText
                  primary={group.label}
                  primaryTypographyProps={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                  }}
                />
                <KeyboardArrowDownIcon
                  sx={{
                    fontSize: 18,
                    color: 'text.secondary',
                    transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </ListItemButton>
              <Collapse in={isOpen} timeout={200}>
                <List disablePadding sx={{ pl: 0.5 }}>
                  {group.items.map(itemButton)}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      <Box sx={{ px: 1.5, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, px: 0.5 }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: status.includes('critical')
                ? 'error.main'
                : status.includes('healthy')
                  ? 'success.main'
                  : 'warning.main',
            }}
          />
          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontWeight: 600 }}>
            {status}
          </Typography>
        </Stack>
        <ListItemButton
          onClick={() => go('/support')}
          selected={pathname === '/support'}
          sx={{
            borderRadius: 2,
            py: 0.7,
            px: 1.25,
            '&.Mui-selected': { bgcolor: alpha('#f59e0b', 0.1) },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: '#f59e0b' }}>
            <LocalCafeIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            primary="Support"
            primaryTypographyProps={{ fontSize: '0.84rem', fontWeight: 600 }}
          />
        </ListItemButton>
      </Box>
    </>
  );

  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            bgcolor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {content}
      </Drawer>
    </Box>
  );
}
