import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PortfolioItem {
  id: string;
  asset_symbol: string;
  quantity: number;
  average_buy_price: number | null;
  current_value: number | null;
  last_updated: string;
  exchange_connection_id: string | null;
}

interface ExchangeConnection {
  id: string;
  exchange_name: string;
  is_active: boolean;
  health_status: string | null;
  is_testnet: boolean | null;
}

export const usePortfolioSync = (userId: string | undefined) => {
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { toast } = useToast();

  // Load portfolios from database
  const loadPortfolios = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('current_value', { ascending: false });

    if (error) {
      console.error('Error loading portfolios:', error);
      return;
    }

    setPortfolios(data || []);
  }, [userId]);

  // Load exchange connections
  const loadConnections = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('exchange_connections')
      .select('id, exchange_name, is_active, health_status, is_testnet')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Error loading connections:', error);
      return;
    }

    setConnections(data || []);
  }, [userId]);

  // Sync portfolio from exchanges
  const syncPortfolio = useCallback(async (connectionId?: string) => {
    if (!userId) return;

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-portfolio', {
        body: { connectionId },
      });

      if (error) throw error;

      if (data.success) {
        setLastSyncTime(new Date());
        await loadPortfolios();
        
        toast({
          title: 'Portfolio Synced',
          description: `Synced ${data.syncedExchanges} exchange(s). Total: $${data.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}`,
        });

        if (data.errors?.length > 0) {
          toast({
            title: 'Some exchanges failed',
            description: data.errors.map((e: any) => `${e.exchange}: ${e.error}`).join(', '),
            variant: 'destructive',
          });
        }
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Portfolio sync error:', error);
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync portfolio',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [userId, loadPortfolios, toast]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return;

    loadPortfolios();
    loadConnections();

    // Subscribe to portfolio changes
    const portfolioChannel = supabase
      .channel('portfolio-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolios',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Portfolio change:', payload);
          loadPortfolios();
        }
      )
      .subscribe();

    // Subscribe to transaction changes
    const transactionChannel = supabase
      .channel('transaction-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New transaction:', payload);
          // Trigger portfolio refresh on new transaction
          loadPortfolios();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(portfolioChannel);
      supabase.removeChannel(transactionChannel);
    };
  }, [userId, loadPortfolios, loadConnections]);

  // Calculate total value
  const totalValue = portfolios.reduce((sum, p) => sum + (p.current_value || 0), 0);

  return {
    portfolios,
    connections,
    totalValue,
    isSyncing,
    lastSyncTime,
    syncPortfolio,
    loadPortfolios,
    loadConnections,
  };
};
