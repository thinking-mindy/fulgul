"use client";

import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Button,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  alpha,
} from '@mui/material';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import GitHubIcon from '@mui/icons-material/GitHub';
import StarIcon from '@mui/icons-material/Star';
import BugReportIcon from '@mui/icons-material/BugReport';
import CodeIcon from '@mui/icons-material/Code';
import ForumIcon from '@mui/icons-material/Forum';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import PageHeader from '../../components/ui/PageHeader';
import SectionLabel, { Panel } from '../../components/ui/SectionLabel';

const LINKS = {
  github: 'https://github.com/thinking-mindy/fulgul',
  issues: 'https://github.com/thinking-mindy/fulgul/issues',
  discussions: 'https://github.com/thinking-mindy/fulgul/discussions',
  coffee: 'https://www.thinkingminds.co.zw/buy-coffee',
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
    <Box sx={{ width: '100%' }}>
      <PageHeader
        eyebrow="Community"
        title="Support Fulgul"
        subtitle="Free and open. Coffee, stars, and contributions are optional."
      />

      <Panel sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: (t) => alpha(t.palette.warning.main, 0.12),
              color: 'warning.main',
            }}
          >
            <VolunteerActivismIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.35 }}>
              Enjoying Fulgul?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A coffee, a star, or a bug report helps keep development moving.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="contained"
              color="warning"
              startIcon={<LocalCafeIcon />}
              onClick={() => openExternal(LINKS.coffee)}
              sx={{ borderRadius: 2 }}
            >
              Buy a coffee
            </Button>
            <Button
              variant="outlined"
              startIcon={<StarIcon />}
              onClick={() => openExternal(LINKS.github)}
              sx={{ borderRadius: 2 }}
            >
              Star on GitHub
            </Button>
          </Stack>
        </Box>
      </Panel>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Panel>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
              <LocalCafeIcon color="warning" fontSize="small" />
              <Typography sx={{ fontWeight: 700 }}>Buy a coffee</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
              Tips help cover hosting, tooling, and ongoing feature work.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              color="warning"
              startIcon={<LocalCafeIcon />}
              onClick={() => openExternal(LINKS.coffee)}
              sx={{ borderRadius: 2 }}
            >
              Buy a coffee
            </Button>
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Panel>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
              <CodeIcon color="primary" fontSize="small" />
              <Typography sx={{ fontWeight: 700 }}>Contribute</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
              Fork the repo, open a PR, or help triage issues.
            </Typography>
            <Stack spacing={1}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GitHubIcon />}
                onClick={() => openExternal(LINKS.github)}
                sx={{ borderRadius: 2 }}
              >
                View repository
              </Button>
              <Button
                fullWidth
                variant="text"
                startIcon={<ForumIcon />}
                onClick={() => openExternal(LINKS.discussions)}
                sx={{ borderRadius: 2 }}
              >
                Discussions
              </Button>
            </Stack>
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Panel>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
              <BugReportIcon color="error" fontSize="small" />
              <Typography sx={{ fontWeight: 700 }}>Report & improve</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
              Bugs and feature ideas shape the roadmap.
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<BugReportIcon />}
              onClick={() => openExternal(LINKS.issues)}
              sx={{ borderRadius: 2 }}
            >
              Open an issue
            </Button>
          </Panel>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Panel>
            <SectionLabel>Everything included</SectionLabel>
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
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Panel>
            <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 1 }}>
              Built by Thinking Minds
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65, mb: 1.5 }}>
              Fulgul: The Spark is free security tooling without subscription lock-in.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Free & open source
            </Typography>
          </Panel>
        </Grid>
      </Grid>
    </Box>
  );
}
