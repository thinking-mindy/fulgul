"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import { useLocalScan } from '../../hooks/useLocalScan';
import ScanButton from '../../components/ScanButton';
import SecurityScoreGauge from '../../components/SecurityScoreGauge';
import VulnerabilityTable from '../../components/VulnerabilityTable';
import PortTable from '../../components/PortTable';
import VulnerabilityCard from '../../components/VulnerabilityCard';
import { invoke } from '@tauri-apps/api/core';
import DefenseWorkspaceBar from '../../components/defense/DefenseWorkspaceBar';
import type { StoredVulnerability } from '../../types/tauri';

export default function ScanLocalPage() {
  const { scan, loading, result, error } = useLocalScan();
  const [storedVulns, setStoredVulns] = useState<Array<StoredVulnerability & { scanId: string }>>([]);
  const [loadingVulns, setLoadingVulns] = useState(false);

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

  return (
    <Box>
      <DefenseWorkspaceBar />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Local Machine Scan
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Deep local scan: packages, misconfigs, exposed services, banners, and known CVE patterns
          </Typography>
        </Box>
        <ScanButton onClick={scan} loading={loading} />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

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
                      Operating System
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
                    <Typography variant="body2">{result.vulnerabilities.length}</Typography>
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
                {storedVulns.length > 0 ? (
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
                Ready to Scan
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Click "Start Scan" to begin scanning your local machine for security issues.
              </Typography>
              <ScanButton onClick={scan} loading={loading} />
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

