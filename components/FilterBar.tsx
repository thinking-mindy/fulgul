"use client";

import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Button,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  severityFilter: string;
  onSeverityChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  onClear: () => void;
}

export default function FilterBar({
  searchTerm,
  onSearchChange,
  severityFilter,
  onSeverityChange,
  statusFilter,
  onStatusChange,
  onClear,
}: FilterBarProps) {
  const hasFilters = searchTerm || severityFilter !== 'all' || statusFilter !== 'all';

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <TextField
          placeholder="Search vulnerabilities..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Severity</InputLabel>
          <Select
            value={severityFilter}
            label="Severity"
            onChange={(e) => onSeverityChange(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="in-progress">In Progress</MenuItem>
            <MenuItem value="fixed">Fixed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>
        {hasFilters && (
          <Button
            startIcon={<ClearIcon />}
            onClick={onClear}
            variant="outlined"
            size="small"
          >
            Clear
          </Button>
        )}
      </Stack>
      {hasFilters && (
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 1 }}>
          {searchTerm && (
            <Chip
              label={`Search: ${searchTerm}`}
              onDelete={() => onSearchChange('')}
              size="small"
            />
          )}
          {severityFilter !== 'all' && (
            <Chip
              label={`Severity: ${severityFilter}`}
              onDelete={() => onSeverityChange('all')}
              size="small"
            />
          )}
          {statusFilter !== 'all' && (
            <Chip
              label={`Status: ${statusFilter}`}
              onDelete={() => onStatusChange('all')}
              size="small"
            />
          )}
        </Stack>
      )}
    </Box>
  );
}

