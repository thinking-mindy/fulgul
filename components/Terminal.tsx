"use client";

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Stack,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { invoke } from '@tauri-apps/api/core';

interface TerminalProps {
  command: string;
  onComplete?: (success: boolean, output: string) => void;
  onClose?: () => void;
}

interface CommandOutput {
  output: string[];
  status: string;
  exitCode?: number;
  command: string;
}

export default function Terminal({ command, onComplete, onClose }: TerminalProps) {
  const [output, setOutput] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [waitingForPassword, setWaitingForPassword] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastOutputLength, setLastOutputLength] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if command requires sudo
    const requiresSudo = command.includes('sudo');
    if (requiresSudo) {
      setWaitingForPassword(true);
      addOutput('Command requires sudo privileges. Please enter your password:', false);
    } else {
      executeCommand();
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [command]);

  useEffect(() => {
    // Auto-scroll to bottom when output changes
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const addOutput = (text: string, isError: boolean = false) => {
    setOutput((prev) => {
      const newOutput = [...prev, text];
      return newOutput;
    });
  };

  const pollOutput = async (sessionId: string) => {
    try {
      const result = await invoke<CommandOutput>('get_command_output', {
        sessionId,
      });

      // Add new output lines
      if (result.output.length > lastOutputLength) {
        const newLines = result.output.slice(lastOutputLength);
        newLines.forEach((line) => {
          const isError = line.startsWith('[stderr]');
          addOutput(isError ? line : line, isError);
        });
        setLastOutputLength(result.output.length);
      }

      // Check if command completed
      if (result.status === 'completed' || result.status === 'failed') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        setExecuting(false);

        if (result.status === 'completed') {
          addOutput(`\n✓ Command completed successfully (exit code: ${result.exitCode || 0})`, false);
          if (onComplete) {
            onComplete(true, result.output.join('\n'));
          }
        } else {
          const errorMsg = `Command failed with exit code: ${result.exitCode || -1}`;
          setError(errorMsg);
          addOutput(`\n✗ ${errorMsg}`, true);
          if (onComplete) {
            onComplete(false, result.output.join('\n'));
          }
        }
      }
    } catch (err) {
      console.error('Failed to poll output:', err);
    }
  };

  const executeCommand = async () => {
    setExecuting(true);
    setError(null);
    setOutput([]);
    setLastOutputLength(0);
    addOutput(`$ ${command}`, false);
    addOutput('', false); // Empty line for spacing

    try {
      // Start command execution
      const sessionId = await invoke<string>('start_command_execution', {
        command,
        password: command.includes('sudo') && password ? password : null,
      });

      setSessionId(sessionId);
      addOutput('Starting command execution...', false);

      // Start polling for output
      pollingIntervalRef.current = setInterval(() => {
        pollOutput(sessionId);
      }, 200); // Poll every 200ms for real-time feel

      // Initial poll
      pollOutput(sessionId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Command execution failed';
      setError(errorMsg);
      addOutput(`Error: ${errorMsg}`, true);
      setExecuting(false);

      // Check if it's a password prompt
      if (errorMsg.includes('password') || errorMsg.includes('Password') || errorMsg.includes('[sudo]')) {
        setWaitingForPassword(true);
        addOutput('Password required. Please enter your password:', false);
      } else {
        if (onComplete) {
          onComplete(false, errorMsg);
        }
      }
    }
  };

  const handlePasswordSubmit = () => {
    if (!password.trim()) {
      setError('Please enter a password');
      return;
    }
    setWaitingForPassword(false);
    executeCommand();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (waitingForPassword) {
        handlePasswordSubmit();
      }
    }
  };

  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: 'background.default',
        border: '1px solid',
        borderColor: 'divider',
        maxHeight: 600,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
          Interactive Terminal
        </Typography>
        {onClose && (
          <Button size="small" onClick={onClose}>
            Close
          </Button>
        )}
      </Box>

      {error && !waitingForPassword && !executing && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Command Display */}
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          mb: 2,
          bgcolor: 'background.paper',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
        }}
      >
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          Command:
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
          {command}
        </Typography>
      </Paper>

      {/* Output Display */}
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          mb: 2,
          bgcolor: '#1e1e1e',
          color: '#d4d4d4',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          flexGrow: 1,
          maxHeight: 400,
          overflow: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#2d2d2d',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#555',
            borderRadius: '4px',
          },
        }}
      >
        {output.length === 0 && !executing && (
          <Typography variant="body2" color="text.secondary">
            Ready to execute command...
          </Typography>
        )}
        {output.map((line, idx) => {
          const isError = line.includes('[stderr]') || line.includes('✗') || line.includes('Error:');
          const isSuccess = line.includes('✓');
          return (
            <Typography
              key={idx}
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                color: isError
                  ? '#f48771'
                  : isSuccess
                  ? '#4ec9b0'
                  : line.startsWith('$')
                  ? '#569cd6'
                  : '#d4d4d4',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.5,
              }}
            >
              {line || ' '}
            </Typography>
          );
        })}
        {executing && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <CircularProgress size={12} sx={{ color: '#4ec9b0' }} />
            <Typography variant="body2" sx={{ color: '#4ec9b0', fontFamily: 'monospace' }}>
              Executing...
            </Typography>
          </Box>
        )}
        <div ref={outputEndRef} />
      </Paper>

      {/* Password Input */}
      {waitingForPassword && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This command requires administrator privileges. Enter your password to continue.
          </Alert>
          <TextField
            fullWidth
            type={showPassword ? 'text' : 'password'}
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={executing}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText="Your password will be used to execute the command with sudo privileges"
          />
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handlePasswordSubmit}
              disabled={!password.trim() || executing}
              startIcon={<SendIcon />}
            >
              Execute
            </Button>
            {onClose && (
              <Button variant="outlined" onClick={onClose} disabled={executing}>
                Cancel
              </Button>
            )}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}
