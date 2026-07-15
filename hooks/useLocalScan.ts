import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ScanResult } from '../types/tauri';

export function useLocalScan() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scan = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await invoke<ScanResult>('scan_local_machine');
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan local machine');
    } finally {
      setLoading(false);
    }
  };

  return { scan, loading, result, error };
}

