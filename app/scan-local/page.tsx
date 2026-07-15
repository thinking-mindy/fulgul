"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
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
import PageHeader from '../../components/ui/PageHeader';
import { Panel } from '../../components/ui/SectionLabel';
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
    <Box sx={{ width: '100%' }}>
      <DefenseWorkspaceBar />
      <PageHeader
        eyebrow="Detect"
        title="Local machine scan"
        subtitle="Packages, misconfigs, exposed services, and known CVE patterns."
        actions={<ScanButton onClick={scan} loading={loading} />}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
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
                  <Typography variant="caption" color="text.secondary">Operating system</Typography>
                  <Typography variant="body2">{result.os}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Scan time</Typography>
                  <Typography variant="body2">{new Date(result.timestamp).toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Vulnerabilities found</Typography>
                  <Typography variant="body2">{result.vulnerabilities.length}</Typography>
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
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Ready to scan</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
              Start a local scan to check packages, misconfigs, and exposed services.
            </Typography>
            <ScanButton onClick={scan} loading={loading} />
          </Box>
        </Panel>
      )}
    </Box>
  );
}
