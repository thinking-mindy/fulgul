"use client";

import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  alpha,
} from '@mui/material';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import FavoriteIcon from '@mui/icons-material/Favorite';
import GitHubIcon from '@mui/icons-material/GitHub';
import StarIcon from '@mui/icons-material/Star';
import BugReportIcon from '@mui/icons-material/BugReport';
import CodeIcon from '@mui/icons-material/Code';
import ForumIcon from '@mui/icons-material/Forum';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';

const LINKS = {
  github: 'https://github.com/thinking-mindy/fulgul',
  issues: 'https://github.com/thinking-mindy/fulgul/issues',
  discussions: 'https://github.com/thinking-mindy/fulgul/discussions',
  coffee: 'https://buymeacoffee.com/thinkingminds',
};

const FREE_FEATURES = [
  'Unlimited vulnerability scans',
  'Red & blue team pipelines',
  'Attack lab & credential testing',
  'Recon, enumeration & loot vault',
  'Engagement reports & PDF export',
  'System hardening & auto-response',
  'Shared pentest & defense workspaces',
  'No accounts, no paywalls',
];

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function SupportPage() {
  return (
    <Box>
      <PageHeader
        eyebrow="Community"
        title="Free forever."
        titleAccent="Support optional."
        subtitle="Fulgul is free and open — built by Thinking Minds for security teams who need real tooling without subscription lock-in. If it helps you, consider buying us a coffee or contributing back."
        chips={['100% free', 'No billing', 'Open source']}
      />

      <GlassCard highlight sx={{ mb: 3 }}>
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha('#f59e0b', 0.15),
              color: '#f59e0b',
            }}
          >
            <VolunteerActivismIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Enjoying Fulgul?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your support keeps development going — whether that&apos;s a coffee, a GitHub star, or a bug report.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="contained"
              color="warning"
              startIcon={<LocalCafeIcon />}
              onClick={() => openExternal(LINKS.coffee)}
            >
              Buy me a coffee
            </Button>
            <Button
              variant="outlined"
              startIcon={<StarIcon />}
              onClick={() => openExternal(LINKS.github)}
            >
              Star on GitHub
            </Button>
          </Stack>
        </Box>
      </GlassCard>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <GlassCard sx={{ height: '100%' }}>
            <Box sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <LocalCafeIcon color="warning" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Buy a coffee
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                A small tip helps cover hosting, tooling, and the time spent building features you use every day.
              </Typography>
              <Button
                fullWidth
                variant="contained"
                color="warning"
                startIcon={<LocalCafeIcon />}
                onClick={() => openExternal(LINKS.coffee)}
              >
                Buy Me a Coffee
              </Button>
            </Box>
          </GlassCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <GlassCard sx={{ height: '100%' }}>
            <Box sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <CodeIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Contribute code
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Fork the repo, open a pull request, or help triage issues. Every contribution makes Fulgul better for everyone.
              </Typography>
              <Stack spacing={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<GitHubIcon />}
                  onClick={() => openExternal(LINKS.github)}
                >
                  View repository
                </Button>
                <Button
                  fullWidth
                  variant="text"
                  startIcon={<ForumIcon />}
                  onClick={() => openExternal(LINKS.discussions)}
                >
                  Join discussions
                </Button>
              </Stack>
            </Box>
          </GlassCard>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <GlassCard sx={{ height: '100%' }}>
            <Box sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <BugReportIcon color="error" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Report & improve
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Found a bug or have a feature idea? Open an issue — feedback from real users shapes the roadmap.
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<BugReportIcon />}
                onClick={() => openExternal(LINKS.issues)}
              >
                Open an issue
              </Button>
            </Box>
          </GlassCard>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <GlassCard>
            <Box sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Everything included — no tiers
              </Typography>
              <List dense disablePadding>
                {FREE_FEATURES.map((feature) => (
                  <ListItem key={feature} disablePadding sx={{ py: 0.4 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon color="success" sx={{ fontSize: 18 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={feature}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </GlassCard>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <GlassCard>
            <Box sx={{ p: 2.5, textAlign: 'center' }}>
              <FavoriteIcon sx={{ fontSize: 40, color: 'error.main', mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Made with care
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Fulgul: The Spark is built by{' '}
                <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  Thinking Minds
                </Typography>
                . We believe security tooling should be accessible to everyone — not locked behind enterprise pricing.
              </Typography>
              <Chip
                label="Free & open"
                color="success"
                size="small"
                sx={{ fontWeight: 700 }}
              />
            </Box>
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
}
