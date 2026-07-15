"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  TextField,
  Divider,
  Paper,
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
import type { DefenseWorkspace, StoredVulnerability } from '../../types/tauri';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

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

  // Ports 1-500 for display (showing first 50 common ports for UI)
  const commonPorts = Array.from({ length: 50 }, (_, i) => i + 1);

  return (
    <Box>
      <DefenseWorkspaceBar />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Remote IP Scan
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Scan a remote IP for 1,000+ ports, service banners, and known exploit patterns
          </Typography>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Scan Configuration
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <TextField
              label="IP Address"
              placeholder="192.168.1.10"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              fullWidth
              disabled={loading}
              helperText="Ports 1–1024 + high-risk services, banner/CVE probes, 90s max"
              sx={{ maxWidth: 400 }}
            />
            <ScanButton onClick={handleScan} loading={loading} />
          </Box>
          <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'warning.dark' }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              ⚠️ Warning: Only scan IP addresses you own or have explicit permission to scan.
              Unauthorized scanning may be illegal.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ⚡ Deep scan: 1,000+ ports, service banners, anonymous FTP/Redis checks, CVE pattern matching
            </Typography>
          </Paper>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Progress Display */}
      {loading && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <ScanProgress progress={progress} currentStep={currentStep} logs={logs} />
            
            {/* Real-time Port Discovery */}
            {discoveredPorts.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Discovered Ports ({discoveredPorts.length})
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 200, overflow: 'auto' }}>
                  {discoveredPorts.slice().sort((a, b) => a - b).map((port) => (
                    <Chip
                      key={port}
                      label={port}
                      size="small"
                      icon={<CheckCircleIcon />}
                      color="success"
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {result && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <SecurityScoreGauge score={result.securityScore} grade={result.securityGrade} />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Scan Information
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Target
                    </Typography>
                    <Typography variant="body2">{result.os}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Scan Time
                    </Typography>
                    <Typography variant="body2">
                      {new Date(result.timestamp).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Vulnerabilities Found
                    </Typography>
                    <Typography variant="body2">
                      {storedVulns.length > 0 ? storedVulns.length : result.vulnerabilities.length}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Open Ports
                    </Typography>
                    <Typography variant="body2">{result.openPorts.length}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Vulnerabilities ({storedVulns.length > 0 ? storedVulns.length : result.vulnerabilities.length})
                </Typography>
                {loadingVulns ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
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
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Open Ports ({result.openPorts.length})
                </Typography>
                <PortTable ports={result.openPorts} services={result.services} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {!result && !loading && (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" gutterBottom>
                Enter IP Address to Scan
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter a valid IP address above and click "Start Scan" to begin.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
