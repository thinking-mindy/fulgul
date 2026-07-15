"use client";

import { Paper, Typography, Box } from '@mui/material';

interface LogsConsoleProps {
  logs: string[];
}

export default function LogsConsole({ logs }: LogsConsoleProps) {
  if (logs.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No logs available
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        bgcolor: 'background.default',
        maxHeight: 400,
        overflow: 'auto',
        fontFamily: 'monospace',
      }}
    >
      {logs.map((log, index) => (
        <Box key={index} sx={{ mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {log}
          </Typography>
        </Box>
      ))}
    </Paper>
  );
}

