import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ScanResult } from '../types/tauri';

export function useRemoteScan() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [discoveredPorts, setDiscoveredPorts] = useState<number[]>([]);

  const scan = async (ip: string) => {
    if (!ip || !ip.trim()) {
      setError('Please enter a valid IP address');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setCurrentStep('Initializing scan...');
    setLogs([]);
    setDiscoveredPorts([]);

    try {
      // Progress animation while backend scans 1,000+ ports with live probes
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          return prev + 0.5; // Slower increment since we have more ports
        });
      }, 100);

      // Update logs
      setLogs((prev) => [...prev, `Starting scan of ${ip}...`]);
      setCurrentStep('Scanning ports...');

      // Call the actual scan
      const response = await invoke<ScanResult>('scan_remote_ip', { ip: ip.trim() });

      clearInterval(progressInterval);
      setProgress(100);
      setCurrentStep('Scan complete!');
      setLogs((prev) => [
        ...prev,
        `Scan completed. Found ${response.openPorts.length} open ports.`,
        `Detected ${response.vulnerabilities.length} vulnerabilities.`,
      ]);

      // Show discovered ports
      setDiscoveredPorts(response.openPorts);

      setResult(response);
    } catch (err) {
      setProgress(0);
      setCurrentStep('Scan failed');
      setError(err instanceof Error ? err.message : 'Failed to scan remote IP');
      setLogs((prev) => [...prev, `Error: ${err instanceof Error ? err.message : 'Unknown error'}`]);
    } finally {
      setLoading(false);
    }
  };

  return { scan, loading, result, error, progress, currentStep, logs, discoveredPorts };
}
