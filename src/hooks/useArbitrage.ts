import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  buy_exchange: string;
  sell_exchange: string;
  buy_price: number;
  sell_price: number;
  spread_percent: number;
  estimated_profit: number;
  volume_available: number;
  detected_at: string;
  expires_at: string | null;
  status: 'active' | 'executed' | 'expired' | 'missed';
}

interface UseArbitrageOptions {
  autoScan?: boolean;
  scanInterval?: number; // in milliseconds
  symbols?: string[];
}

export const useArbitrage = (options: UseArbitrageOptions = {}) => {
  const { 
    autoScan = false, 
    scanInterval = 30000,
    symbols 
  } = options;
  
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch active opportunities from database
  const loadOpportunities = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('arbitrage-scanner', {
        body: { action: 'get_active' }
      });

      if (fetchError) throw fetchError;
      
      setOpportunities(data?.opportunities || []);
      setError(null);
    } catch (e) {
      console.error('Error loading arbitrage opportunities:', e);
      setError(e instanceof Error ? e.message : 'Failed to load opportunities');
    }
  }, []);

  // Scan for new opportunities
  const scanForOpportunities = useCallback(async () => {
    if (isScanning) return;
    
    setIsScanning(true);
    setError(null);
    
    try {
      const { data, error: scanError } = await supabase.functions.invoke('arbitrage-scanner', {
        body: { 
          action: 'scan',
          symbols: symbols || undefined
        }
      });

      if (scanError) throw scanError;
      
      setOpportunities(data?.opportunities || []);
      setLastScanTime(new Date(data?.scannedAt || Date.now()));
    } catch (e) {
      console.error('Error scanning for arbitrage:', e);
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, symbols]);

  // Execute an arbitrage opportunity
  const executeArbitrage = useCallback(async (opportunityId: string, quantity: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: execError } = await supabase.functions.invoke('arbitrage-scanner', {
        body: { 
          action: 'execute',
          opportunityId,
          quantity,
          userId: user.id
        }
      });

      if (execError) throw execError;
      
      // Refresh opportunities
      loadOpportunities();
      
      return data;
    } catch (e) {
      console.error('Error executing arbitrage:', e);
      throw e;
    }
  }, [loadOpportunities]);

  // Auto-scan at interval
  useEffect(() => {
    if (!autoScan) return;

    // Initial scan
    scanForOpportunities();

    const interval = setInterval(() => {
      scanForOpportunities();
    }, scanInterval);

    return () => clearInterval(interval);
  }, [autoScan, scanInterval, scanForOpportunities]);

  // Load opportunities on mount
  useEffect(() => {
    loadOpportunities();
  }, [loadOpportunities]);

  // Calculate best opportunity
  const bestOpportunity = opportunities.reduce<ArbitrageOpportunity | null>((best, current) => {
    if (!best || current.spread_percent > best.spread_percent) {
      return current;
    }
    return best;
  }, null);

  return {
    opportunities,
    bestOpportunity,
    isScanning,
    lastScanTime,
    error,
    scanForOpportunities,
    executeArbitrage,
    loadOpportunities
  };
};
