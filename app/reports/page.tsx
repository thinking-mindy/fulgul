"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Chip,
  Alert,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Divider,
  alpha,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import SyncIcon from '@mui/icons-material/Sync';
import { invoke } from '@tauri-apps/api/core';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import StatCard from '../../components/ui/StatCard';
import type { PentestActivity, PentestReport } from '../../types/tauri';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'scan', label: 'Scans' },
  { id: 'credential', label: 'Credentials' },
  { id: 'attack', label: 'Attack Lab' },
  { id: 'recon', label: 'Recon' },
  { id: 'notes', label: 'Notes' },
];

const severityColor = (s: string) => {
  switch (s) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#3b82f6';
    default: return '#64748b';
  }
};

const categoryIcon = (c: string) => {
  switch (c) {
    case 'scan': return '🔍';
    case 'credential': return '🔑';
    case 'attack': return '⚔️';
    case 'recon': return '🛰️';
    case 'notes': return '📝';
    default: return '📋';
  }
};

export default function ReportsPage() {
  const [activities, setActivities] = useState<PentestActivity[]>([]);
  const [reports, setReports] = useState<PentestReport[]>([]);
  const [activeReport, setActiveReport] = useState<PentestReport | null>(null);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [acts, rpts] = await Promise.all([
        invoke<PentestActivity[]>('list_pentest_activities', { category: null, limit: 300 }),
        invoke<PentestReport[]>('list_pentest_reports'),
      ]);
      setActivities(acts);
      setReports(rpts);
      if (activeReport) {
        const fresh = rpts.find((r) => r.id === activeReport.id);
        if (fresh) setActiveReport(fresh);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [activeReport?.id]);

  useEffect(() => { loadData(); }, []);

  const filteredActivities = useMemo(() => {
    if (category === 'all') return activities;
    return activities.filter((a) => a.category === category);
  }, [activities, category]);

  const reportActivities = useMemo(() => {
    if (!activeReport) return [];
    return activeReport.activityIds
      .map((id) => activities.find((a) => a.id === id))
      .filter(Boolean) as PentestActivity[];
  }, [activeReport, activities]);

  const visibleCount = activeReport?.visibleIds.length ?? 0;
  const totalInReport = activeReport?.activityIds.length ?? 0;

  const createReport = async () => {
    try {
      const report = await invoke<PentestReport>('create_pentest_report', {
        title: `Engagement Report — ${new Date().toLocaleDateString()}`,
        client: 'Client name',
        tester: 'Pentester',
        scope: 'Authorized in-scope assets only.',
        executiveSummary: '',
        activityIds: activities.map((a) => a.id),
      });
      setActiveReport(report);
      setReports((r) => [report, ...r]);
    } catch (e) {
      setError(String(e));
    }
  };

  const saveReport = async () => {
    if (!activeReport) return;
    setSaving(true);
    try {
      const updated = await invoke<PentestReport>('update_pentest_report', { report: activeReport });
      setActiveReport(updated);
      setReports((r) => r.map((x) => (x.id === updated.id ? updated : x)));
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const syncActivities = async () => {
    if (!activeReport) return;
    try {
      const updated = await invoke<PentestReport>('sync_report_activities', { id: activeReport.id });
      setActiveReport(updated);
      await loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const toggleVisible = (activityId: string) => {
    if (!activeReport) return;
    const visible = activeReport.visibleIds.includes(activityId);
    const visibleIds = visible
      ? activeReport.visibleIds.filter((id) => id !== activityId)
      : [...activeReport.visibleIds, activityId];
    setActiveReport({ ...activeReport, visibleIds });
  };

  const toggleInReport = (activityId: string) => {
    if (!activeReport) return;
    const included = activeReport.activityIds.includes(activityId);
    let activityIds: string[];
    let visibleIds: string[];
    if (included) {
      activityIds = activeReport.activityIds.filter((id) => id !== activityId);
      visibleIds = activeReport.visibleIds.filter((id) => id !== activityId);
    } else {
      activityIds = [...activeReport.activityIds, activityId];
      visibleIds = [...activeReport.visibleIds, activityId];
    }
    setActiveReport({ ...activeReport, activityIds, visibleIds });
  };

  const loadPreview = async () => {
    if (!activeReport) return;
    setPreviewLoading(true);
    try {
      await saveReport();
      const md = await invoke<string>('export_pentest_report_markdown', { id: activeReport.id });
      setPreview(md);
    } catch (e) {
      setError(String(e));
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadText = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportFile = async (format: 'md' | 'html' | 'pdf') => {
    if (!activeReport) return;
    try {
      await saveReport();
      const base = activeReport.title.replace(/[^\w.-]+/g, '_');
      if (format === 'pdf') {
        const bytes = await invoke<number[]>('export_pentest_report_pdf', { id: activeReport.id });
        const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${base}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      }
      const content = format === 'md'
        ? await invoke<string>('export_pentest_report_markdown', { id: activeReport.id })
        : await invoke<string>('export_pentest_report_html', { id: activeReport.id });
      downloadText(
        content,
        `${base}.${format === 'md' ? 'md' : 'html'}`,
        format === 'md' ? 'text/markdown' : 'text/html',
      );
    } catch (e) {
      setError(String(e));
    }
  };

  const addNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) return;
    try {
      await invoke('add_pentest_note', {
        title: noteTitle,
        content: noteContent,
        target: activeReport?.client || null,
      });
      setNoteTitle('');
      setNoteContent('');
      await loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await invoke('delete_pentest_report', { id });
      setReports((r) => r.filter((x) => x.id !== id));
      if (activeReport?.id === id) {
        setActiveReport(null);
        setPreview('');
      }
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Offensive · Reporting"
        title="Document everything."
        titleAccent="Share what matters."
        subtitle="Every scan, brute, recon run, and attack lab session is logged automatically. Build client-ready reports with show/hide controls."
        chips={['Auto-capture', 'Toggle sections', 'MD & HTML export']}
      />

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Activities logged" value={activities.length} icon={<AssessmentIcon />} tone="primary" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Saved reports" value={reports.length} icon={<SaveIcon />} tone="info" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Visible in report" value={visibleCount} icon={<VisibilityIcon />} tone="success" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="In report total" value={totalInReport} icon={<VisibilityOffIcon />} tone="warning" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Activity feed */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <GlassCard>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={700}>Activity log</Typography>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={loadData} disabled={loading}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>

            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 2, gap: 0.5 }}>
              {CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  label={c.label}
                  size="small"
                  onClick={() => setCategory(c.id)}
                  color={category === c.id ? 'primary' : 'default'}
                  variant={category === c.id ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>

            <Stack spacing={1} sx={{ maxHeight: 520, overflow: 'auto', pr: 0.5 }}>
              {loading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={28} /></Box>
              ) : filteredActivities.length === 0 ? (
                <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: 'center' }}>
                  No activities yet. Run scans, recon, or credential tests — they appear here automatically.
                </Typography>
              ) : (
                filteredActivities.map((act) => {
                  const inReport = activeReport?.activityIds.includes(act.id);
                  const visible = activeReport?.visibleIds.includes(act.id);
                  return (
                    <Box
                      key={act.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: inReport ? 'primary.main' : 'divider',
                        bgcolor: inReport ? alpha('#3b82f6', 0.06) : 'transparent',
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="flex-start">
                        <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>{categoryIcon(act.category)}</Typography>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{act.title}</Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>{act.target}</Typography>
                          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">
                            <Chip label={act.severity} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: alpha(severityColor(act.severity), 0.15), color: severityColor(act.severity) }} />
                            <Chip label={act.kind} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {new Date(act.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                        {activeReport && (
                          <Stack>
                            <Tooltip title={inReport ? 'Remove from report' : 'Add to report'}>
                              <IconButton size="small" onClick={() => toggleInReport(act.id)}>
                                {inReport ? <DeleteIcon fontSize="small" color="error" /> : <AddIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            {inReport && (
                              <Tooltip title={visible ? 'Hide in export' : 'Show in export'}>
                                <IconButton size="small" onClick={() => toggleVisible(act.id)}>
                                  {visible ? <VisibilityIcon fontSize="small" color="primary" /> : <VisibilityOffIcon fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        )}
                      </Stack>
                    </Box>
                  );
                })
              )}
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Quick note</Typography>
            <Stack spacing={1}>
              <TextField size="small" label="Title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
              <TextField size="small" label="Content" multiline rows={2} value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
              <Button size="small" startIcon={<NoteAddIcon />} onClick={addNote} variant="outlined">Add note to log</Button>
            </Stack>
          </GlassCard>
        </Grid>

        {/* Report composer */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <GlassCard highlight>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={700}>Report builder</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={createReport} variant="contained">
                New
              </Button>
            </Stack>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Report</InputLabel>
              <Select
                label="Report"
                value={activeReport?.id ?? ''}
                onChange={(e) => {
                  const r = reports.find((x) => x.id === e.target.value);
                  setActiveReport(r ?? null);
                  setPreview('');
                }}
              >
                {reports.map((r) => (
                  <MenuItem key={r.id} value={r.id}>{r.title}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {activeReport ? (
              <Stack spacing={2}>
                <TextField
                  label="Report title"
                  value={activeReport.title}
                  onChange={(e) => setActiveReport({ ...activeReport, title: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Client"
                  value={activeReport.client}
                  onChange={(e) => setActiveReport({ ...activeReport, client: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Tester"
                  value={activeReport.tester}
                  onChange={(e) => setActiveReport({ ...activeReport, tester: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Scope"
                  multiline
                  rows={2}
                  value={activeReport.scope}
                  onChange={(e) => setActiveReport({ ...activeReport, scope: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Executive summary"
                  multiline
                  rows={3}
                  value={activeReport.executiveSummary}
                  onChange={(e) => setActiveReport({ ...activeReport, executiveSummary: e.target.value })}
                  fullWidth
                />

                <Typography variant="subtitle2" color="text.secondary">
                  Included activities ({reportActivities.length})
                </Typography>
                <Stack spacing={0.5} sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {reportActivities.map((act) => (
                    <FormControlLabel
                      key={act.id}
                      control={
                        <Switch
                          size="small"
                          checked={activeReport.visibleIds.includes(act.id)}
                          onChange={() => toggleVisible(act.id)}
                        />
                      }
                      label={
                        <Typography variant="caption" noWrap sx={{ maxWidth: 220 }}>
                          {act.title}
                        </Typography>
                      }
                      sx={{ m: 0 }}
                    />
                  ))}
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Button startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />} onClick={saveReport} variant="contained" disabled={saving}>
                    Save
                  </Button>
                  <Button startIcon={<SyncIcon />} onClick={syncActivities} variant="outlined">Sync all</Button>
                  <Button startIcon={<DownloadIcon />} onClick={() => exportFile('md')} variant="outlined">Export MD</Button>
                  <Button startIcon={<DownloadIcon />} onClick={() => exportFile('html')} variant="outlined">Export HTML</Button>
                  <Button startIcon={<DownloadIcon />} onClick={() => exportFile('pdf')} variant="outlined">Export PDF</Button>
                  <IconButton color="error" onClick={() => deleteReport(activeReport.id)}><DeleteIcon /></IconButton>
                </Stack>
              </Stack>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">
                  Create a report to start composing. Activities from scans, recon, credentials, and attack lab are captured automatically.
                </Typography>
              </Box>
            )}
          </GlassCard>
        </Grid>

        {/* Preview */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <GlassCard>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={700}>Live preview</Typography>
              <Button size="small" onClick={loadPreview} disabled={!activeReport || previewLoading}>
                {previewLoading ? <CircularProgress size={16} /> : 'Generate'}
              </Button>
            </Stack>

            {!preview ? (
              <Box
                sx={{
                  py: 6,
                  textAlign: 'center',
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: 'divider',
                }}
              >
                <AssessmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary" variant="body2">
                  Toggle activities on/off, then generate preview. Hidden items stay in the report file but won&apos;t appear in exports.
                </Typography>
              </Box>
            ) : (
              <Box
                component="pre"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  fontSize: '0.72rem',
                  overflow: 'auto',
                  maxHeight: 600,
                  m: 0,
                  fontFamily: 'ui-monospace, monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {preview}
              </Box>
            )}
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  );
}
