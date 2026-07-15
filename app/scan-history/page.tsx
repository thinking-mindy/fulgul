"use client";

import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DownloadIcon from '@mui/icons-material/Download';
import { invoke } from '@tauri-apps/api/core';
import type { ScanComparison, StoredScanResult } from '../../types/tauri';
import { normalizeScanHistory } from '../../lib/scan';
import { useRouter } from 'next/navigation';

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
      <Box>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
          Scan History
        </Typography>
        <Card>
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              Loading scan history...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Scan History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage your previous security scans
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
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
          >
            Compare scans
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={exporting || history.length === 0}
          >
            Export report
          </Button>
          <Button variant="outlined" onClick={loadHistory}>
            Refresh
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {history.length === 0 ? (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" gutterBottom>
                No Scan History
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start scanning to build your history
              </Typography>
              <Button
                variant="contained"
                onClick={() => router.push('/scan-local')}
                sx={{ mr: 2 }}
              >
                Scan Local Machine
              </Button>
              <Button variant="outlined" onClick={() => router.push('/scan-remote')}>
                Scan Remote IP
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Target</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Vulnerabilities</TableCell>
                <TableCell>Security Score</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((scan) => {
                const fixedCount = scan.vulnerabilities.filter((v) => v.status === 'fixed').length;
                const pendingCount = scan.vulnerabilities.filter((v) => v.status === 'pending').length;
                return (
                  <TableRow key={scan.scanId} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {scan.os}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(scan.timestamp).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Chip
                          label={`${scan.vulnerabilities.length} total`}
                          color={scan.vulnerabilities.length > 0 ? 'error' : 'success'}
                          size="small"
                        />
                        {fixedCount > 0 && (
                          <Chip
                            label={`${fixedCount} fixed`}
                            color="success"
                            size="small"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        )}
                        {pendingCount > 0 && (
                          <Chip
                            label={`${pendingCount} pending`}
                            color="warning"
                            size="small"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {scan.securityScore}
                        </Typography>
                          <Chip
                            label={scan.securityGrade || 'Unknown'}
                            color={getGradeColor(scan.securityGrade) as any}
                            size="small"
                          />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => router.push(`/vulnerabilities?scanId=${scan.scanId}`)}
                        >
                          View
                        </Button>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(scan.scanId)}
                          color="error"
                        >
                          <DeleteIcon />
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

      <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Compare scans</DialogTitle>
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
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Chip
                  label={`Score ${comparison.baselineScore} → ${comparison.currentScore}`}
                  color={comparison.scoreDelta >= 0 ? 'success' : 'error'}
                />
                <Chip
                  label={`${comparison.scoreDelta >= 0 ? '+' : ''}${comparison.scoreDelta} pts`}
                  variant="outlined"
                />
                <Chip label={`${comparison.unchangedCount} unchanged`} variant="outlined" />
              </Stack>

              {comparison.newVulnerabilities.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="error.main" gutterBottom>
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
                  <Typography variant="subtitle2" color="success.main" gutterBottom>
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
                  <Alert severity="info">No vulnerability changes between these two scans.</Alert>
                )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareOpen(false)}>Close</Button>
          <Button variant="contained" onClick={handleCompare} disabled={comparing || !baselineId || !currentId}>
            {comparing ? 'Comparing…' : 'Run comparison'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

