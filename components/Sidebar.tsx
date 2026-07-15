"use client";

import { useState, useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  Chip,
  CircularProgress,
  alpha,
  Collapse,
  Stack,
  Tooltip,
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
import AnalyticsIcon from '@mui/icons-material/Analytics';
import RadarIcon from '@mui/icons-material/Radar';
import HistoryIcon from '@mui/icons-material/History';
import LanIcon from '@mui/icons-material/Lan';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { invoke } from '@tauri-apps/api/core';
import type { StoredVulnerability } from '../types/tauri';
import { averageSecurityScore, normalizeScanHistory } from '../lib/scan';

const drawerWidth = 268;

type BadgeKey = 'vulnerabilities' | 'scans' | 'pending' | 'critical';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  badgeKey?: BadgeKey;
  hub?: boolean;
  desc?: string;
}

interface NavSubsection {
  label: string;
  items: NavItem[];
}

interface NavDomain {
  id: string;
  label: string;
  tagline: string;
  accent: string;
  accentSoft: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  hub?: NavItem;
  subsections: NavSubsection[];
}

const quickLaunch: NavItem[] = [
  { path: '/', label: 'Command Center', icon: DashboardIcon, hub: true, desc: 'Dashboard & overview' },
  { path: '/terminal', label: 'Security Shell', icon: TerminalIcon, desc: 'Live command execution' },
];

const defenseDomain: NavDomain = {
  id: 'defense',
  label: 'Blue Team',
  tagline: 'Detect · Harden · Respond',
  accent: '#10b981',
  accentSoft: '#34d399',
  icon: ShieldIcon,
  defaultOpen: true,
  hub: { path: '/blue-team', label: 'Defense Pipeline', icon: HubIcon, hub: true, desc: 'Full defensive workflow' },
  subsections: [
    {
      label: 'Scope',
      items: [{ path: '/defense-scope', label: 'Asset Scope', icon: AssignmentIcon, desc: 'Protected assets & networks' }],
    },
    {
      label: 'Discovery',
      items: [
        { path: '/scan-local', label: 'Local Scan', icon: RadarIcon, desc: 'Audit this machine' },
        { path: '/scan-remote', label: 'Remote Scan', icon: LanIcon, desc: 'Probe network targets' },
        { path: '/scan-history', label: 'Scan History', icon: HistoryIcon, badgeKey: 'scans', desc: 'Past scan results' },
      ],
    },
    {
      label: 'Assessment',
      items: [
        { path: '/vulnerabilities', label: 'Vulnerabilities', icon: BugReportIcon, badgeKey: 'vulnerabilities', desc: 'Tracked findings' },
        { path: '/risk-posture', label: 'Risk Analysis', icon: AnalyticsIcon, desc: 'Compare & trend scores' },
      ],
    },
    {
      label: 'Remediation',
      items: [
        { path: '/hardening', label: 'Harden Systems', icon: BuildIcon, badgeKey: 'pending', desc: 'Apply security fixes' },
        { path: '/response', label: 'Auto Response', icon: AutoFixHighIcon, desc: 'Automated reactions' },
      ],
    },
    {
      label: 'Deliverables',
      items: [
        { path: '/reports', label: 'Security Reports', icon: AssessmentIcon, desc: 'MD, HTML, PDF export' },
        { path: '/defensive', label: 'Defensive Hub', icon: ShieldIcon, desc: 'Overview dashboard' },
      ],
    },
  ],
};

const offenseDomain: NavDomain = {
  id: 'offense',
  label: 'Red Team',
  tagline: 'Recon · Exploit · Report',
  accent: '#f43f5e',
  accentSoft: '#fb7185',
  icon: GavelIcon,
  defaultOpen: true,
  hub: { path: '/red-team', label: 'Kill Chain Pipeline', icon: HubIcon, hub: true, desc: 'Full pentest workflow' },
  subsections: [
    {
      label: 'Planning',
      items: [{ path: '/engagement', label: 'Engagement Scope', icon: AssignmentIcon, desc: 'Authorization & ROE' }],
    },
    {
      label: 'Intelligence',
      items: [
        { path: '/recon', label: 'Recon Hub', icon: TravelExploreIcon, desc: 'DNS, TLS, WHOIS' },
        { path: '/enumerate', label: 'Enumeration', icon: ManageSearchIcon, desc: 'Ports, subs, paths' },
      ],
    },
    {
      label: 'Exploitation',
      items: [
        { path: '/scan-remote', label: 'Vuln Scan', icon: BugReportIcon, desc: 'Remote vulnerability scan' },
        { path: '/attacks', label: 'Attack Lab', icon: SecurityIcon, desc: 'Scenario labs' },
        { path: '/credentials', label: 'Credential Lab', icon: BoltIcon, desc: 'WiFi, SSH, HTTP' },
      ],
    },
    {
      label: 'Post-Exploit',
      items: [{ path: '/loot', label: 'Loot Vault', icon: InventoryIcon, desc: 'Captured creds & flags' }],
    },
    {
      label: 'Deliverables',
      items: [
        { path: '/reports', label: 'Engagement Reports', icon: AssessmentIcon, desc: 'MD, HTML, PDF export' },
        { path: '/offensive', label: 'Offensive Hub', icon: GavelIcon, desc: 'Lab scenarios overview' },
      ],
    },
  ],
};

const footerItem: NavItem = {
  path: '/support',
  label: 'Buy me a coffee',
  icon: LocalCafeIcon,
  desc: 'Free software · contribute',
};

function allDomainPaths(domain: NavDomain): string[] {
  const paths = domain.subsections.flatMap((s) => s.items.map((i) => i.path));
  if (domain.hub) paths.unshift(domain.hub.path);
  return paths;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [badges, setBadges] = useState({ vulnerabilities: 0, scans: 0, pending: 0, critical: 0 });
  const [securityStatus, setSecurityStatus] = useState({ isActive: false, hasIssues: false, message: 'Loading...' });
  const [loading, setLoading] = useState(true);
  const [openDomains, setOpenDomains] = useState<Record<string, boolean>>({ defense: true, offense: false });

  const FooterIcon = footerItem.icon;

  const activeDomain = useMemo(() => {
    if (allDomainPaths(defenseDomain).includes(pathname)) return 'defense';
    if (allDomainPaths(offenseDomain).includes(pathname)) return 'offense';
    return null;
  }, [pathname]);

  useEffect(() => {
    if (activeDomain) {
      setOpenDomains({ defense: activeDomain === 'defense', offense: activeDomain === 'offense' });
    }
  }, [activeDomain]);

  useEffect(() => {
    loadSidebarData();
    const interval = setInterval(loadSidebarData, 30000);
    return () => clearInterval(interval);
  }, [pathname]);

  const loadSidebarData = async () => {
    try {
      const history = normalizeScanHistory(await invoke<unknown[]>('get_scan_history'));
      const allVulns = await invoke<Array<[StoredVulnerability, string]>>('get_all_vulnerabilities');
      const criticalVulns = allVulns.filter(
        ([v]) => v.severity.toLowerCase() === 'critical' || v.severity.toLowerCase() === 'high',
      ).length;

      setBadges({
        vulnerabilities: allVulns.length,
        scans: history.length,
        pending: allVulns.filter(([v]) => v.status === 'pending').length,
        critical: criticalVulns,
      });

      const averageScore = averageSecurityScore(history);
      setSecurityStatus({
        isActive: history.length > 0,
        hasIssues: criticalVulns > 0 || averageScore < 50,
        message:
          history.length > 0
            ? criticalVulns > 0
              ? `${criticalVulns} critical finding${criticalVulns !== 1 ? 's' : ''}`
              : averageScore >= 70
                ? 'Posture healthy'
                : 'Review recommended'
            : 'Awaiting first scan',
      });
    } catch {
      setSecurityStatus({ isActive: false, hasIssues: false, message: 'Status unavailable' });
    } finally {
      setLoading(false);
    }
  };

  const navigate = (path: string) => {
    router.push(path);
    if (isMobile && onMobileClose) onMobileClose();
  };

  const badgeCount = (key?: BadgeKey) => (key ? badges[key] : null);

  const renderQuickTile = (item: NavItem) => {
    const Icon = item.icon;
    const active = pathname === item.path;
    return (
      <Box
        key={item.path}
        onClick={() => navigate(item.path)}
        sx={{
          flex: 1,
          p: 1.25,
          borderRadius: 2,
          cursor: 'pointer',
          border: '1px solid',
          borderColor: active ? alpha(theme.palette.primary.main, 0.5) : 'divider',
          bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.background.default, 0.5),
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            transform: 'translateY(-1px)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
          <Icon sx={{ fontSize: 17, color: active ? 'primary.main' : 'text.secondary' }} />
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, lineHeight: 1.2 }}>{item.label}</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem', lineHeight: 1.2 }}>
          {item.desc}
        </Typography>
      </Box>
    );
  };

  const renderNavItem = (item: NavItem, accent: string) => {
    const Icon = item.icon;
    const active = pathname === item.path;
    const count = badgeCount(item.badgeKey);

    return (
      <ListItem key={item.path} disablePadding sx={{ mb: 0.25, pl: 1 }}>
        <Tooltip title={item.desc ?? item.label} placement="right" enterDelay={600}>
          <ListItemButton
            onClick={() => navigate(item.path)}
            selected={active}
            sx={{
              borderRadius: 2.5,
              py: 0.85,
              px: 1.25,
              minHeight: 36,
              gap: 1.25,
              transition: 'background-color 0.18s ease, transform 0.18s ease',
              '&.Mui-selected': {
                bgcolor: alpha(accent, 0.1),
                '& .MuiListItemText-primary': { fontWeight: 700, color: accent },
                '& .nav-ico': { color: accent, bgcolor: alpha(accent, 0.15) },
                '&:hover': { bgcolor: alpha(accent, 0.14) },
              },
              '&:hover': {
                bgcolor: active ? alpha(accent, 0.14) : alpha(theme.palette.action.hover, 0.06),
                transform: 'translateX(2px)',
              },
            }}
          >
              <ListItemIcon sx={{ minWidth: 0, mr: 0 }}>
                <Box
                  className="nav-ico"
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(theme.palette.text.primary, 0.05),
                    color: 'text.secondary',
                    transition: 'all 0.18s ease',
                    '& svg': { fontSize: 18 },
                  }}
                >
                  <Icon />
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: active ? 600 : 500, noWrap: true, color: active ? accent : 'text.primary' }}
              />
              {item.hub && !active && (
                <Chip label="HUB" size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 800, mr: 0.5, bgcolor: alpha(accent, 0.1), color: accent }} />
              )}
              {count !== null && count > 0 && (
                <Chip
                  label={count > 99 ? '99+' : count}
                  size="small"
                  sx={{
                    height: 18,
                    minWidth: 20,
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    bgcolor: active ? accent : alpha(theme.palette.error.main, 0.12),
                    color: active ? '#fff' : 'error.main',
                  }}
                />
              )}
              {active && (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: accent,
                    flexShrink: 0,
                  }}
                />
              )}
          </ListItemButton>
        </Tooltip>
      </ListItem>
    );
  };

  const renderDomain = (domain: NavDomain) => {
    const DomainIcon = domain.icon;
    const open = openDomains[domain.id] ?? domain.defaultOpen ?? false;
    const active = allDomainPaths(domain).includes(pathname);

    return (
      <Box
        key={domain.id}
        sx={{
          mb: 1.5,
          borderRadius: 2.5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: active ? alpha(domain.accent, 0.35) : 'divider',
          bgcolor: active ? alpha(domain.accent, 0.04) : alpha(theme.palette.background.default, 0.35),
          boxShadow: active ? `0 0 0 1px ${alpha(domain.accent, 0.08)}` : 'none',
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        }}
      >
        {/* Domain header */}
        <Box
          onClick={() => setOpenDomains((p) => ({ ...p, [domain.id]: !open }))}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            px: 1.25,
            py: 1.1,
            cursor: 'pointer',
            borderLeft: `2px solid ${alpha(domain.accent, 0.6)}`,
            background: `linear-gradient(90deg, ${alpha(domain.accent, 0.1)} 0%, transparent 70%)`,
            '&:hover': { bgcolor: alpha(domain.accent, 0.06) },
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${alpha(domain.accent, 0.25)} 0%, ${alpha(domain.accentSoft, 0.15)} 100%)`,
              color: domain.accent,
              border: `1px solid ${alpha(domain.accent, 0.2)}`,
            }}
          >
            <DomainIcon sx={{ fontSize: 17 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              {domain.label}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.62rem', color: 'text.secondary' }}>
              {domain.tagline}
            </Typography>
          </Box>
          {active && (
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: domain.accent, boxShadow: `0 0 10px ${domain.accent}` }} />
          )}
          {open ? (
            <KeyboardArrowDownIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          ) : (
            <KeyboardArrowRightIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          )}
        </Box>

        <Collapse in={open} timeout={240}>
          <Box sx={{ pt: 0.5, pb: 1 }}>
            {/* Hub link */}
            {domain.hub && (
              <Box sx={{ px: 1, mb: 0.5 }}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => navigate(domain.hub!.path)}
                    selected={pathname === domain.hub!.path}
                    sx={{
                      borderRadius: 2,
                      py: 0.85,
                      px: 1.25,
                      border: '1px dashed',
                      borderColor: pathname === domain.hub!.path ? alpha(domain.accent, 0.4) : alpha(domain.accent, 0.18),
                      bgcolor: pathname === domain.hub!.path ? alpha(domain.accent, 0.1) : 'transparent',
                      '&:hover': { bgcolor: alpha(domain.accent, 0.08) },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 34 }}>
                      <DomainIcon sx={{ fontSize: 18, color: domain.accent }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={domain.hub.label}
                      secondary="Entry point"
                      primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 700 }}
                      secondaryTypographyProps={{ fontSize: '0.62rem' }}
                    />
                  </ListItemButton>
                </ListItem>
              </Box>
            )}

            {domain.subsections.map((sub) => (
              <Box key={sub.label} sx={{ mt: 0.5 }}>
                <ListItemButton
                  sx={{
                    py: 0.55,
                    px: 1.5,
                    mx: 1,
                    mb: 0.15,
                    borderRadius: 2,
                    minHeight: 28,
                    '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.04) },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      flex: 1,
                      fontWeight: 700,
                      fontSize: '0.68rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: alpha(domain.accent, 0.85),
                    }}
                  >
                    {sub.label}
                  </Typography>
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{
                      px: 0.75,
                      py: 0.15,
                      borderRadius: 1,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      bgcolor: alpha(theme.palette.text.primary, 0.06),
                      color: 'text.secondary',
                    }}
                  >
                    {sub.items.length}
                  </Typography>
                </ListItemButton>
                <List disablePadding>
                  {sub.items.map((item) => renderNavItem(item, domain.accent))}
                </List>
              </Box>
            ))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const drawerContent = (
    <>
      {/* Brand + live metrics */}
      <Box
        sx={{
          px: 2,
          pt: 2.5,
          pb: 2,
          borderBottom: '1px solid',
          borderColor: (t) => alpha(t.palette.divider, 0.45),
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.secondary.main})`,
              borderRadius: 2.5,
              boxShadow: (t) => `0 4px 14px ${alpha(t.palette.primary.main, 0.2)}`,
            }}
          >
            <BoltIcon sx={{ fontSize: 22 }} />
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.1 }} noWrap>
              Fulgul
            </Typography>
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', color: 'text.secondary' }} noWrap>
              SECURITY PLATFORM
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.75}>
          {[
            { label: 'Scans', value: badges.scans, color: theme.palette.info.main },
            { label: 'Vulns', value: badges.vulnerabilities, color: theme.palette.error.main },
            { label: 'Pending', value: badges.pending, color: theme.palette.warning.main },
          ].map((m) => (
            <Box
              key={m.label}
              sx={{
                flex: 1,
                py: 0.75,
                px: 0.75,
                borderRadius: 1.5,
                textAlign: 'center',
                bgcolor: alpha(m.color, 0.08),
                border: '1px solid',
                borderColor: alpha(m.color, 0.15),
              }}
            >
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: m.color, lineHeight: 1 }}>
                {loading ? '—' : m.value}
              </Typography>
              <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: 'text.secondary', letterSpacing: '0.06em' }}>
                {m.label.toUpperCase()}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Nav body */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1.25,
          px: 1,
          '&::-webkit-scrollbar': { width: 5 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: alpha(theme.palette.text.primary, 0.12),
            borderRadius: 4,
          },
        }}
      >
        <Typography sx={{ px: 0.75, pb: 0.75, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.16em', color: 'text.disabled' }}>
          QUICK LAUNCH
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ mb: 2 }}>
          {quickLaunch.map(renderQuickTile)}
        </Stack>

        <Typography sx={{ px: 0.75, pb: 0.75, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.16em', color: 'text.disabled' }}>
          OPERATIONS
        </Typography>
        {renderDomain(defenseDomain)}
        {renderDomain(offenseDomain)}
      </Box>

      {/* Pinned footer — always visible */}
      <Box
        sx={{
          flexShrink: 0,
          px: 1.25,
          pt: 1,
          borderTop: '1px solid',
          borderColor: (t) => alpha(t.palette.divider, 0.45),
          bgcolor: (t) => alpha(t.palette.background.default, 0.4),
        }}
      >
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton
            onClick={() => navigate(footerItem.path)}
            selected={pathname === footerItem.path}
            sx={{
              borderRadius: 2,
              py: 0.85,
              px: 1.25,
              border: '1px solid',
              borderColor: pathname === footerItem.path ? alpha('#f59e0b', 0.4) : 'divider',
              bgcolor: pathname === footerItem.path ? alpha('#f59e0b', 0.1) : alpha(theme.palette.background.default, 0.5),
              '&:hover': { bgcolor: alpha('#f59e0b', 0.08), borderColor: alpha('#f59e0b', 0.35) },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha('#f59e0b', 0.15),
                  color: '#f59e0b',
                }}
              >
                <FooterIcon sx={{ fontSize: 16 }} />
              </Box>
            </ListItemIcon>
            <ListItemText
              primary={footerItem.label}
              secondary={footerItem.desc}
              primaryTypographyProps={{ fontSize: '0.8rem', fontWeight: 700 }}
              secondaryTypographyProps={{ fontSize: '0.62rem' }}
            />
          </ListItemButton>
        </ListItem>
        <Box
          sx={{
            borderRadius: 2,
            p: 1.25,
            mb: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            background: (t) =>
              securityStatus.hasIssues
                ? `linear-gradient(135deg, ${alpha(t.palette.error.main, 0.12)} 0%, transparent 100%)`
                : securityStatus.isActive
                  ? `linear-gradient(135deg, ${alpha(t.palette.success.main, 0.1)} 0%, transparent 100%)`
                  : `linear-gradient(135deg, ${alpha(t.palette.warning.main, 0.08)} 0%, transparent 100%)`,
            border: '1px solid',
            borderColor: securityStatus.hasIssues
              ? alpha(theme.palette.error.main, 0.2)
              : securityStatus.isActive
                ? alpha(theme.palette.success.main, 0.2)
                : alpha(theme.palette.warning.main, 0.15),
          }}
        >
          {loading ? (
            <CircularProgress size={16} />
          ) : (
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: securityStatus.hasIssues
                  ? alpha(theme.palette.error.main, 0.15)
                  : securityStatus.isActive
                    ? alpha(theme.palette.success.main, 0.15)
                    : alpha(theme.palette.warning.main, 0.12),
              }}
            >
              <ShieldIcon
                sx={{
                  fontSize: 17,
                  color: securityStatus.hasIssues ? 'error.main' : securityStatus.isActive ? 'success.main' : 'warning.main',
                }}
              />
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.1em', color: 'text.secondary' }}>
              SECURITY POSTURE
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.25 }} noWrap>
              {loading ? 'Syncing...' : securityStatus.message}
            </Typography>
          </Box>
        </Box>
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
            borderColor: (t) => alpha(t.palette.divider, 0.55),
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
