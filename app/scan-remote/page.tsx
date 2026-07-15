"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Alert,
  TextField,
  Divider,
  Stack,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useRemoteScan } from '../../hooks/useRemoteScan';
import ScanButton from '../../components/ScanButton';
import SecurityScoreGauge from '../../components/SecurityScoreGauge';
import VulnerabilityTable from '../../components/VulnerabilityTable';
import PortTable from '../../components/PortTable';
import VulnerabilityCard from '../../components/VulnerabilityCard';
import ScanProgress from '../../components/ScanProgress';
import { invoke } from '@tauri-apps/api/core';
import DefenseWorkspaceBar from '../../components/defense/DefenseWorkspaceBar';
import PageHeader from '../../components/ui/PageHeader';
import { Panel } from '../../components/ui/SectionLabel';
import type { DefenseWorkspace, StoredVulnerability } from '../../types/tauri';

export default function ScanRemotePage() {
  const [ip, setIp] = useState('');
  const { scan, loading, result, error, progress, currentStep, logs, discoveredPorts } = useRemoteScan();
  const [storedVulns, setStoredVulns] = useState<Array<StoredVulnerability & { scanId: string }>>([]);
  const [loadingVulns, setLoadingVulns] = useState(false);

  useEffect(() => {
    invoke<DefenseWorkspace>('get_defense_workspace').then((ws) => {
      if (ws.primaryAsset && !ip) {
        const t = ws.primaryAsset.trim();
        if (t.match(/^[\d.]+$/) || t.includes('/')) setIp(t.split('/')[0]);
        else if (ws.assets[0]?.ip) setIp(ws.assets[0].ip!);
      }
    }).catch(() => {});
  }, [ip]);

  useEffect(() => {
    if (result) {
      loadStoredVulnerabilities(result.id);
    }
  }, [result]);

  const loadStoredVulnerabilities = async (scanId: string) => {
    setLoadingVulns(true);
    try {
      const vulns = await invoke<StoredVulnerability[]>('get_vulnerabilities_by_scan', { scanId });
      setStoredVulns(vulns.map((v) => ({ ...v, scanId })));
    } catch (err) {
      console.error('Failed to load stored vulnerabilities:', err);
    } finally {
      setLoadingVulns(false);
    }
  };

  const handleScan = () => {
    if (ip.trim()) {
      scan(ip.trim());
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <DefenseWorkspaceBar />
      <PageHeader
        eyebrow="Detect"
        title="Remote IP scan"
        subtitle="Authorized targets only — ports, banners, and service exposure."
      />

      <Panel sx={{ mb: 2.5 }}>
        <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 2 }}>
          Scan configuration
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            label="IP Address"
            placeholder="192.168.1.10"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            helperText="Ports 1–1024 + high-risk services · 90s max"
            sx={{ maxWidth: 400 }}
          />
          <ScanButton onClick={handleScan} loading={loading} />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, maxWidth: 520, lineHeight: 1.6 }}>
          Only scan hosts you own or have explicit permission to assess. Unauthorized scanning may be illegal.
        </Typography>
      </Panel>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Panel sx={{ mb: 2.5 }}>
          <ScanProgress progress={progress} currentStep={currentStep} logs={logs} />

          {discoveredPorts.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                Discovered ports ({discoveredPorts.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, maxHeight: 200, overflow: 'auto' }}>
                {discoveredPorts.slice().sort((a, b) => a - b).map((port) => (
                  <Chip
                    key={port}
                    label={port}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      height: 24,
                      fontSize: '0.7rem',
                      borderColor: 'divider',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Panel>
      )}

      {result && (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Panel sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <SecurityScoreGauge score={result.securityScore} grade={result.securityGrade} />
            </Panel>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Panel>
              <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 2 }}>
                Scan information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Target</Typography>
                  <Typography variant="body2">{result.os}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Scan time</Typography>
                  <Typography variant="body2">{new Date(result.timestamp).toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Vulnerabilities found</Typography>
                  <Typography variant="body2">
                    {storedVulns.length > 0 ? storedVulns.length : result.vulnerabilities.length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Open ports</Typography>
                  <Typography variant="body2">{result.openPorts.length}</Typography>
                </Box>
              </Stack>
            </Panel>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Panel>
              <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 2.5 }}>
                Vulnerabilities ({storedVulns.length > 0 ? storedVulns.length : result.vulnerabilities.length})
              </Typography>
              {loadingVulns ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={28} thickness={3} />
                </Box>
              ) : storedVulns.length > 0 ? (
                <Stack spacing={2}>
                  {storedVulns.map((vuln) => (
                    <VulnerabilityCard
                      key={vuln.id}
                      vulnerability={vuln}
                      scanId={vuln.scanId}
                      onStatusUpdate={() => loadStoredVulnerabilities(result.id)}
                    />
                  ))}
                </Stack>
              ) : (
                <VulnerabilityTable vulnerabilities={result.vulnerabilities} />
              )}
            </Panel>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Panel>
              <Typography sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 2.5 }}>
                Open ports ({result.openPorts.length})
              </Typography>
              <PortTable ports={result.openPorts} services={result.services} />
            </Panel>
          </Grid>
        </Grid>
      )}

      {!result && !loading && (
        <Panel>
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Enter an IP to scan</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto' }}>
              Provide a permitted address above and start the scan.
            </Typography>
          </Box>
        </Panel>
      )}
    </Box>
  );
}
