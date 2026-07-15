"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Button,
  Menu,
  MenuItem,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { invoke } from '@tauri-apps/api/core';
import type { StoredVulnerability } from '../../types/tauri';
import VulnerabilityCard from '../../components/VulnerabilityCard';
import FilterBar from '../../components/FilterBar';
import DefenseWorkspaceBar from '../../components/defense/DefenseWorkspaceBar';

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
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <DefenseWorkspaceBar />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            All Vulnerabilities
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage vulnerabilities from all scans
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={(e) => setExportAnchor(e.currentTarget)}
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
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stats.total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                {stats.critical}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Critical/High
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                {stats.pending}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                {stats.inProgress}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                {stats.fixed}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Fixed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                {stats.failed}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Failed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Bar */}
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

      {/* Vulnerabilities List */}
      {filteredVulns.length === 0 ? (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" gutterBottom>
                No Vulnerabilities Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {vulnerabilities.length === 0
                  ? 'Run a scan to detect vulnerabilities'
                  : 'Try adjusting your filters'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
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
