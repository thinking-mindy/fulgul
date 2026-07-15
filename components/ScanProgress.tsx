"use client";

import { Box, LinearProgress, Typography, Paper } from '@mui/material';

interface ScanProgressProps {
  progress: number;
  currentStep: string;
  logs?: string[];
}

export default function ScanProgress({ progress, currentStep, logs }: ScanProgressProps) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {currentStep}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Math.round(progress)}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 10,
            borderRadius: 1,
            bgcolor: 'action.hover',
          }}
        />
      </Box>
      {logs && logs.length > 0 && (
        <Box
          sx={{
            mt: 2,
            maxHeight: 200,
            overflow: 'auto',
            bgcolor: 'background.default',
            p: 1.5,
            borderRadius: 1,
            fontFamily: 'monospace',
          }}
        >
          {logs.map((log, index) => (
            <Typography key={index} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {log}
            </Typography>
          ))}
        </Box>
      )}
    </Paper>
  );
}

