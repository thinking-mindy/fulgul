"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import BugReportIcon from '@mui/icons-material/BugReport';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SyncIcon from '@mui/icons-material/Sync';
import { invoke } from '@tauri-apps/api/core';
import type { StoredVulnerability } from '../../types/tauri';
import VulnerabilityCard from '../../components/VulnerabilityCard';
import FilterBar from '../../components/FilterBar';
import DefenseWorkspaceBar from '../../components/defense/DefenseWorkspaceBar';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import { Panel } from '../../components/ui/SectionLabel';

export default function VulnerabilitiesPage() {
  const [loading, setLoading] = useState(true);
  const [vulnerabilities, setVulnerabilities] = useState<Array<StoredVulnerability & { scanId: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    loadVulnerabilities();
  }, []);

  const loadVulnerabilities = async () => {
    setLoading(true);
    setError(null);
    try {
      const allVulns = await invoke<Array<[StoredVulnerability, string]>>('get_all_vulnerabilities');
      const vulnsWithScanId = allVulns.map(([v, scanId]) => ({ ...v, scanId }));
      setVulnerabilities(vulnsWithScanId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vulnerabilities');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setExportAnchor(null);
    const filtered = getFilteredVulnerabilities();

    if (format === 'json') {
      const json = JSON.stringify(filtered, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vulnerabilities-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = ['ID', 'Title', 'Severity', 'Status', 'Description', 'CVE', 'Detected At'];
      const rows = filtered.map((v) => [
        v.id,
        v.title,
        v.severity,
        v.status,
        v.description.replace(/,/g, ';'),
        v.cve || 'N/A',
        v.detectedAt,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vulnerabilities-${new Date().toISOString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getFilteredVulnerabilities = () => {
    return vulnerabilities.filter((vuln) => {
      const matchesSearch =
        vuln.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vuln.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSeverity = severityFilter === 'all' || vuln.severity.toLowerCase() === severityFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || vuln.status === statusFilter;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  };

  const filteredVulns = getFilteredVulnerabilities();

  const stats = {
    total: vulnerabilities.length,
    pending: vulnerabilities.filter((v) => v.status === 'pending').length,
    inProgress: vulnerabilities.filter((v) => v.status === 'in-progress').length,
    fixed: vulnerabilities.filter((v) => v.status === 'fixed').length,
    failed: vulnerabilities.filter((v) => v.status === 'failed').length,
    critical: vulnerabilities.filter((v) => v.severity.toLowerCase() === 'critical' || v.severity.toLowerCase() === 'high').length,
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={32} thickness={3} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <DefenseWorkspaceBar />
      <PageHeader
        eyebrow="Triage"
        title="Vulnerabilities"
        subtitle="Review and manage findings across all scans."
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={(e) => setExportAnchor(e.currentTarget)}
              sx={{ borderRadius: 2 }}
            >
              Export
            </Button>
            <Menu
              anchorEl={exportAnchor}
              open={Boolean(exportAnchor)}
              onClose={() => setExportAnchor(null)}
            >
              <MenuItem onClick={() => handleExport('json')}>Export as JSON</MenuItem>
              <MenuItem onClick={() => handleExport('csv')}>Export as CSV</MenuItem>
            </Menu>
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="Total" value={stats.total} icon={<BugReportIcon fontSize="small" />} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="Critical / high" value={stats.critical} icon={<WarningIcon fontSize="small" />} tone="error" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="Pending" value={stats.pending} icon={<HourglassEmptyIcon fontSize="small" />} tone="warning" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="In progress" value={stats.inProgress} icon={<SyncIcon fontSize="small" />} tone="info" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="Fixed" value={stats.fixed} icon={<CheckCircleIcon fontSize="small" />} tone="success" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="Failed" value={stats.failed} icon={<ErrorOutlineIcon fontSize="small" />} tone="error" />
        </Grid>
      </Grid>

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        severityFilter={severityFilter}
        onSeverityChange={setSeverityFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onClear={() => {
          setSearchTerm('');
          setSeverityFilter('all');
          setStatusFilter('all');
        }}
      />

      {filteredVulns.length === 0 ? (
        <Panel>
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>No vulnerabilities found</Typography>
            <Typography variant="body2" color="text.secondary">
              {vulnerabilities.length === 0
                ? 'Run a scan to detect vulnerabilities'
                : 'Try adjusting your filters'}
            </Typography>
          </Box>
        </Panel>
      ) : (
        <Stack spacing={2}>
          {filteredVulns.map((vuln) => (
            <VulnerabilityCard
              key={`${vuln.scanId}-${vuln.id}`}
              vulnerability={vuln}
              scanId={vuln.scanId}
              onStatusUpdate={loadVulnerabilities}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
