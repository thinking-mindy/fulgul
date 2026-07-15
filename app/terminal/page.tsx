"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Alert, keyframes } from '@mui/material';
import { invoke } from '@tauri-apps/api/core';

interface CommandOutput {
  output: string[];
  status: string;
  exitCode?: number;
  command: string;
}

type LineKind = 'banner' | 'output' | 'error' | 'success' | 'dim' | 'command';

interface TerminalLine {
  id: number;
  kind: LineKind;
  text: string;
  command?: string;
}

const TERMINAL_FONT =
  '"JetBrains Mono", "Fira Code", "Cascadia Code", "Ubuntu Mono", "DejaVu Sans Mono", ui-monospace, monospace';

const PROMPT_USER = 'operator';
const PROMPT_HOST = 'fulgul';

const QUICK_COMMANDS = [
  'uname -a',
  'ss -tlnp 2>/dev/null | head -20',
  'curl -sS http://127.0.0.1:8081/ -o /dev/null -w "%{http_code}"',
  'nmap -sV -p 22,80,443,8081 127.0.0.1',
];

const blink = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
`;

let lineId = 0;
const nextId = () => ++lineId;

const WELCOME: TerminalLine[] = [
  { id: nextId(), kind: 'banner', text: 'Fulgul Security Shell v1.0.3 — Linux x86_64' },
  { id: nextId(), kind: 'dim', text: 'Authorized testing only. Commands run on this host (120s timeout).' },
  { id: nextId(), kind: 'dim', text: "Type 'help' for shortcuts · ↑↓ history · Ctrl+L clear" },
  { id: nextId(), kind: 'output', text: '' },
];

function lineColor(kind: LineKind): string {
  switch (kind) {
    case 'banner':
      return '#7ee787';
    case 'error':
      return '#ff7b72';
    case 'success':
      return '#3fb950';
    case 'dim':
      return '#6e7681';
    case 'command':
      return '#e6edf3';
    default:
      return '#c9d1d9';
  }
}

function Prompt({ cwd = '~' }: { cwd?: string }) {
  return (
    <Box component="span" sx={{ whiteSpace: 'pre' }}>
      <Box component="span" sx={{ color: '#3fb950', fontWeight: 600 }}>
        {PROMPT_USER}@{PROMPT_HOST}
      </Box>
      <Box component="span" sx={{ color: '#79c0ff' }}>
        :{cwd}
      </Box>
      <Box component="span" sx={{ color: '#e6edf3' }}>
        $
      </Box>
      <Box component="span">&nbsp;</Box>
    </Box>
  );
}

export default function TerminalPage() {
  const [lines, setLines] = useState<TerminalLine[]>(WELCOME);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const lastLenRef = useRef(0);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1);
  const draftRef = useRef('');

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines, running, input]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const pushLine = useCallback((line: Omit<TerminalLine, 'id'>) => {
    setLines((prev) => [...prev, { ...line, id: nextId() }]);
  }, []);

  const pushOutput = useCallback(
    (text: string) => {
      const trimmed = text.trimEnd();
      if (!trimmed) {
        pushLine({ kind: 'output', text: '' });
        return;
      }
      trimmed.split('\n').forEach((part) => {
        if (part.startsWith('[stderr]')) {
          pushLine({ kind: 'error', text: part.replace(/^\[stderr\]\s?/, '') });
        } else {
          pushLine({ kind: 'output', text: part });
        }
      });
    },
    [pushLine],
  );

  const showHelp = useCallback(() => {
    pushLine({ kind: 'dim', text: '── Quick commands ──' });
    QUICK_COMMANDS.forEach((cmd) => pushLine({ kind: 'dim', text: `  ${cmd}` }));
    pushLine({ kind: 'dim', text: '── Built-ins ──' });
    pushLine({ kind: 'dim', text: '  help    — show this message' });
    pushLine({ kind: 'dim', text: '  clear   — reset the screen' });
    pushLine({ kind: 'dim', text: '  exit    — close session message' });
  }, [pushLine]);

  const pollOutput = async (sessionId: string) => {
    try {
      const result = await invoke<CommandOutput>('get_command_output', { sessionId });
      if (result.output.length > lastLenRef.current) {
        const newLines = result.output.slice(lastLenRef.current);
        newLines.forEach((line) => pushOutput(line));
        lastLenRef.current = result.output.length;
      }
      if (result.status === 'completed' || result.status === 'failed') {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        setRunning(false);
        pushLine({
          kind: result.status === 'completed' ? 'success' : 'error',
          text:
            result.status === 'completed'
              ? `[exit ${result.exitCode ?? 0}]`
              : `[exit ${result.exitCode ?? -1} — failed]`,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Poll failed');
      setRunning(false);
    }
  };

  const runCommand = async (raw: string) => {
    const command = raw.trim();
    if (!command || running) return;

    setError(null);
    historyRef.current = [...historyRef.current.filter((h) => h !== command), command];
    historyIdxRef.current = historyRef.current.length;
    draftRef.current = '';

    pushLine({ kind: 'command', text: '', command });

    if (command === 'clear') {
      setLines([]);
      return;
    }
    if (command === 'help') {
      showHelp();
      return;
    }
    if (command === 'exit') {
      pushLine({ kind: 'dim', text: 'Session remains open. Close the window to leave Fulgul.' });
      return;
    }

    setRunning(true);
    lastLenRef.current = 0;

    try {
      const sessionId = await invoke<string>('start_command_execution', {
        command,
        password: null,
      });
      pollRef.current = setInterval(() => pollOutput(sessionId), 200);
      pollOutput(sessionId);
    } catch (err) {
      pushLine({ kind: 'error', text: err instanceof Error ? err.message : 'Command failed' });
      setRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = input;
      setInput('');
      runCommand(cmd);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const hist = historyRef.current;
      if (!hist.length) return;
      if (historyIdxRef.current === hist.length) draftRef.current = input;
      historyIdxRef.current = Math.max(0, historyIdxRef.current - 1);
      setInput(hist[historyIdxRef.current] ?? '');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const hist = historyRef.current;
      if (!hist.length) return;
      if (historyIdxRef.current < hist.length - 1) {
        historyIdxRef.current += 1;
        setInput(hist[historyIdxRef.current] ?? '');
      } else {
        historyIdxRef.current = hist.length;
        setInput(draftRef.current);
      }
      return;
    }

    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setInput('');
      pushLine({ kind: 'dim', text: '^C' });
      return;
    }

    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 'calc(100vh - 110px)', md: 'calc(100vh - 130px)' },
        minHeight: 480,
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 1.5, flexShrink: 0 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        onClick={focusInput}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid #30363d',
          boxShadow: '0 16px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
          bgcolor: '#0d1117',
          cursor: 'text',
        }}
      >
        {/* Title bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 1.5,
            py: 0.85,
            bgcolor: '#161b22',
            borderBottom: '1px solid #30363d',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          <Box sx={{ display: 'flex', gap: 0.65 }}>
            {['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => (
              <Box
                key={c}
                sx={{
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  bgcolor: c,
                  boxShadow: `inset 0 -1px 2px ${c}88`,
                }}
              />
            ))}
          </Box>
          <Typography
            sx={{
              flex: 1,
              textAlign: 'center',
              fontFamily: TERMINAL_FONT,
              fontSize: '0.72rem',
              color: '#8b949e',
              letterSpacing: '0.02em',
            }}
          >
            {PROMPT_USER}@{PROMPT_HOST}: ~/security-shell
          </Typography>
          <Box sx={{ width: 52 }} />
        </Box>

        {/* Terminal body */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            px: 2,
            py: 1.75,
            fontFamily: TERMINAL_FONT,
            fontSize: '0.82rem',
            lineHeight: 1.55,
            bgcolor: '#0d1117',
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
            '&::-webkit-scrollbar': { width: 8 },
            '&::-webkit-scrollbar-track': { bgcolor: '#0d1117' },
            '&::-webkit-scrollbar-thumb': { bgcolor: '#30363d', borderRadius: 4 },
          }}
        >
          {lines.map((line) => {
            if (line.kind === 'command') {
              return (
                <Box key={line.id} sx={{ mb: 0.15, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  <Prompt />
                  <Box component="span" sx={{ color: '#e6edf3' }}>
                    {line.command}
                  </Box>
                </Box>
              );
            }
            return (
              <Box
                key={line.id}
                component="div"
                sx={{
                  color: lineColor(line.kind),
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  minHeight: line.text ? undefined : '1.55em',
                }}
              >
                {line.text || '\u00A0'}
              </Box>
            );
          })}

          {/* Active input line */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              mt: 0.15,
              opacity: running ? 0.55 : 1,
            }}
          >
            <Prompt />
            <Box
              component="input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={running}
              autoFocus
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              sx={{
                flex: 1,
                minWidth: 120,
                border: 'none',
                outline: 'none',
                bgcolor: 'transparent',
                color: '#e6edf3',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                lineHeight: 'inherit',
                p: 0,
                m: 0,
                caretColor: 'transparent',
              }}
            />
            {focused && !running && (
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  width: '0.55em',
                  height: '1.1em',
                  bgcolor: '#3fb950',
                  ml: '-1px',
                  verticalAlign: 'text-bottom',
                  animation: `${blink} 1s step-end infinite`,
                }}
              />
            )}
            {running && (
              <Box component="span" sx={{ color: '#6e7681', ml: 0.5, fontSize: '0.75rem' }}>
                executing…
              </Box>
            )}
          </Box>

          <div ref={endRef} />
        </Box>

        {/* Status bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 0.5,
            bgcolor: '#161b22',
            borderTop: '1px solid #30363d',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontFamily: TERMINAL_FONT, fontSize: '0.65rem', color: '#6e7681' }}>
            bash · utf-8 · {running ? 'busy' : 'ready'}
          </Typography>
          <Typography sx={{ fontFamily: TERMINAL_FONT, fontSize: '0.65rem', color: '#6e7681' }}>
            120s timeout · authorized use only
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
