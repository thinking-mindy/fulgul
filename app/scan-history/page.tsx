"use client";

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import { invoke } from '@tauri-apps/api/core';
import type { ScanComparison, StoredScanResult } from '../../types/tauri';
import { normalizeScanHistory } from '../../lib/scan';
import { useRouter } from 'next/navigation';
import PageHeader from '../../components/ui/PageHeader';
import { Panel } from '../../components/ui/SectionLabel';

export default function ScanHistoryPage() {
  const [history, setHistory] = useState<StoredScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [baselineId, setBaselineId] = useState('');
  const [currentId, setCurrentId] = useState('');
  const [comparison, setComparison] = useState<ScanComparison | null>(null);
  const [comparing, setComparing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = normalizeScanHistory(await invoke<unknown[]>('get_scan_history'));
      setHistory(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scan history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scanId: string) => {
    try {
      await invoke('delete_scan_result', { scanId });
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete scan');
    }
  };

  const handleCompare = async () => {
    if (!baselineId || !currentId) return;
    setComparing(true);
    setError(null);
    try {
      const result = await invoke<ScanComparison>('compare_scans', {
        baselineScanId: baselineId,
        currentScanId: currentId,
      });
      setComparison(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compare failed');
    } finally {
      setComparing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const json = await invoke<string>('export_security_report');
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fulgul-security-report-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const getGradeColor = (grade: string | undefined) => {
    if (!grade) return 'default';
    const normalized = grade.toLowerCase();
    if (normalized === 'excellent') return 'success';
    if (normalized === 'good') return 'info';
    if (normalized === 'moderate') return 'warning';
    if (normalized === 'risky') return 'error';
    return 'error';
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
      <PageHeader
        eyebrow="History"
        title="Scan history"
        subtitle="Audit trail of previous security scans."
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<CompareArrowsIcon />}
              onClick={() => {
                setCompareOpen(true);
                if (history.length >= 2) {
                  setBaselineId(history[1].scanId);
                  setCurrentId(history[0].scanId);
                }
              }}
              disabled={history.length < 2}
              sx={{ borderRadius: 2 }}
            >
              Compare
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
              disabled={exporting || history.length === 0}
              sx={{ borderRadius: 2 }}
            >
              Export
            </Button>
            <IconButton
              size="small"
              onClick={loadHistory}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Stack>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {history.length === 0 ? (
        <Panel>
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>No scan history</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 320, mx: 'auto' }}>
              Run a scan to start building your audit trail.
            </Typography>
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button variant="contained" onClick={() => router.push('/scan-local')} sx={{ borderRadius: 2 }}>
                Scan local
              </Button>
              <Button variant="outlined" onClick={() => router.push('/scan-remote')} sx={{ borderRadius: 2 }}>
                Scan remote
              </Button>
            </Stack>
          </Box>
        </Panel>
      ) : (
        <TableContainer
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2.5,
            bgcolor: 'background.paper',
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Target</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Findings</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>Score</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((scan) => {
                const fixedCount = scan.vulnerabilities.filter((v) => v.status === 'fixed').length;
                const pendingCount = scan.vulnerabilities.filter((v) => v.status === 'pending').length;
                return (
                  <TableRow key={scan.scanId} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {scan.os}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(scan.timestamp).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {scan.vulnerabilities.length} total
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {fixedCount > 0 ? `${fixedCount} fixed` : ''}
                        {fixedCount > 0 && pendingCount > 0 ? ' · ' : ''}
                        {pendingCount > 0 ? `${pendingCount} pending` : ''}
                        {fixedCount === 0 && pendingCount === 0 ? '—' : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 800,
                            color:
                              scan.securityScore >= 70
                                ? 'success.main'
                                : scan.securityScore >= 50
                                  ? 'warning.main'
                                  : 'error.main',
                          }}
                        >
                          {scan.securityScore}
                        </Typography>
                        <Chip
                          label={scan.securityGrade || 'Unknown'}
                          color={getGradeColor(scan.securityGrade) as 'success' | 'info' | 'warning' | 'error' | 'default'}
                          size="small"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.65rem', fontWeight: 700 }}
                        />
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => router.push(`/vulnerabilities?scanId=${scan.scanId}`)}
                          sx={{ borderRadius: 2 }}
                        >
                          View
                        </Button>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(scan.scanId)}
                          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Compare scans</DialogTitle>
        <DialogContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1, mb: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Baseline (older)</InputLabel>
              <Select
                value={baselineId}
                label="Baseline (older)"
                onChange={(e) => setBaselineId(e.target.value)}
              >
                {history.map((s) => (
                  <MenuItem key={s.scanId} value={s.scanId}>
                    {s.os} — {new Date(s.timestamp).toLocaleString()} (score {s.securityScore})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Current (newer)</InputLabel>
              <Select
                value={currentId}
                label="Current (newer)"
                onChange={(e) => setCurrentId(e.target.value)}
              >
                {history.map((s) => (
                  <MenuItem key={s.scanId} value={s.scanId}>
                    {s.os} — {new Date(s.timestamp).toLocaleString()} (score {s.securityScore})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {comparison && (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                Score {comparison.baselineScore} → {comparison.currentScore}
                {' '}({comparison.scoreDelta >= 0 ? '+' : ''}{comparison.scoreDelta})
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                {comparison.newVulnerabilities.length} new · {comparison.resolvedVulnerabilities.length} resolved ·{' '}
                {comparison.unchangedCount} unchanged
              </Typography>

              {comparison.newVulnerabilities.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="error.main" gutterBottom sx={{ fontWeight: 700 }}>
                    New findings ({comparison.newVulnerabilities.length})
                  </Typography>
                  <List dense>
                    {comparison.newVulnerabilities.map((v) => (
                      <ListItem key={v.id} disablePadding>
                        <ListItemText
                          primary={v.title}
                          secondary={`${v.severity} · ${v.description.slice(0, 80)}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Divider sx={{ my: 2 }} />
                </>
              )}

              {comparison.resolvedVulnerabilities.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="success.main" gutterBottom sx={{ fontWeight: 700 }}>
                    Resolved ({comparison.resolvedVulnerabilities.length})
                  </Typography>
                  <List dense>
                    {comparison.resolvedVulnerabilities.map((v) => (
                      <ListItem key={v.id} disablePadding>
                        <ListItemText primary={v.title} secondary={v.severity} />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {comparison.newVulnerabilities.length === 0 &&
                comparison.resolvedVulnerabilities.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No vulnerability changes between these two scans.
                  </Typography>
                )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCompareOpen(false)} sx={{ borderRadius: 2 }}>Close</Button>
          <Button
            variant="contained"
            onClick={handleCompare}
            disabled={comparing || !baselineId || !currentId}
            sx={{ borderRadius: 2 }}
          >
            {comparing ? 'Comparing…' : 'Run comparison'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
