"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
} from '@mui/material';

interface PortTableProps {
  ports: number[];
  services?: string[];
}

const PORT_SERVICES: Record<number, string> = {
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  135: 'RPC',
  139: 'NetBIOS',
  143: 'IMAP',
  443: 'HTTPS',
  445: 'SMB',
  993: 'IMAPS',
  995: 'POP3S',
  1433: 'MSSQL',
  3306: 'MySQL',
  3389: 'RDP',
  5432: 'PostgreSQL',
  8080: 'HTTP-Proxy',
};

const DANGEROUS_PORTS = [21, 23, 135, 139, 445, 1433, 3306, 5432, 3389];

export default function PortTable({ ports, services }: PortTableProps) {
  if (ports.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No open ports detected
        </Typography>
      </Paper>
    );
  }

  const isDangerous = (port: number) => DANGEROUS_PORTS.includes(port);
  const getService = (port: number, index: number) => {
    if (services && services[index]) return services[index];
    return PORT_SERVICES[port] || 'Unknown';
  };

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Port</TableCell>
            <TableCell>Service</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ports.map((port, index) => (
            <TableRow key={port} hover>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace" sx={{ fontWeight: 600 }}>
                  {port}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{getService(port, index)}</Typography>
              </TableCell>
              <TableCell>
                {isDangerous(port) ? (
                  <Chip label="Dangerous" color="error" size="small" />
                ) : (
                  <Chip label="Open" color="success" size="small" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

