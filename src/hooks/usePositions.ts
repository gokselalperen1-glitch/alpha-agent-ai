import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useExchangeWebSocket } from './useExchangeWebSocket';

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entry_price: number;
  current_price: number | null;
  quantity: number;
  leverage: number;
  margin_type: 'isolated' | 'cross';
  position_type: 'spot' | 'margin' | 'perpetual' | 'futures';
  liquidation_price: number | null;
  margin_ratio: number | null;
  unrealized_pnl: number | null;
  realized_pnl: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  trailing_stop_percent: number | null;
  status: 'open' | 'closed' | 'liquidated';
  opened_at: string;
  closed_at: string | null;
  exchange_connection_id: string | null;
}

interface UsePositionsOptions {
  userId?: string;
  status?: 'open' | 'closed' | 'liquidated' | 'all';
  enableRealtime?: boolean;
}

export const usePositions = (options: UsePositionsOptions = {}) => {
  const { status = 'open', enableRealtime = true } = options;
  
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get symbols from positions for real-time updates
  const positionSymbols = positions.map(p => p.symbol.replace('/', ''));
  
  const { getTicker, isConnected } = useExchangeWebSocket({
    symbols: positionSymbols.length > 0 ? positionSymbols : ['BTCUSDT'],
    enabled: enableRealtime && positionSymbols.length > 0
  });

  // Fetch user and positions
  const loadPositions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }
      
      setUserId(user.id);

      let query = supabase
        .from('positions')
        .select('*')
        .eq('user_id', user.id)
        .order('opened_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      setPositions((data || []) as Position[]);
      setError(null);
    } catch (e) {
      console.error('Error loading positions:', e);
      setError(e instanceof Error ? e.message : 'Failed to load positions');
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  // Update positions with real-time prices
  useEffect(() => {
    if (!isConnected || positions.length === 0) return;

    const updatedPositions = positions.map(position => {
      const symbolKey = position.symbol.replace('/', '');
      const ticker = getTicker(symbolKey);
      
      if (ticker && ticker.price) {
        const currentPrice = ticker.price;
        const pnlMultiplier = position.side === 'long' ? 1 : -1;
        const unrealizedPnl = (currentPrice - position.entry_price) * position.quantity * pnlMultiplier * position.leverage;
        
        return {
          ...position,
          current_price: currentPrice,
          unrealized_pnl: unrealizedPnl
        };
      }
      return position;
    });

    // Only update if there are actual changes
    const hasChanges = updatedPositions.some((p, i) => 
      p.current_price !== positions[i].current_price || 
      p.unrealized_pnl !== positions[i].unrealized_pnl
    );

    if (hasChanges) {
      setPositions(updatedPositions);
    }
  }, [getTicker, isConnected, positions]);

  // Load on mount and subscribe to realtime changes
  useEffect(() => {
    loadPositions();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('positions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions'
        },
        (payload) => {
          console.log('Position change:', payload);
          loadPositions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPositions]);

  // Calculate aggregate metrics
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
  const totalRealizedPnl = positions.reduce((sum, p) => sum + (p.realized_pnl || 0), 0);
  const totalPositionValue = positions.reduce((sum, p) => 
    sum + ((p.current_price || p.entry_price) * p.quantity), 0);
  const totalMargin = positions.reduce((sum, p) => 
    sum + ((p.current_price || p.entry_price) * p.quantity / p.leverage), 0);

  // Close a position
  const closePosition = useCallback(async (positionId: string, closePrice?: number) => {
    const position = positions.find(p => p.id === positionId);
    if (!position) throw new Error('Position not found');

    const finalPrice = closePrice || position.current_price || position.entry_price;
    const pnlMultiplier = position.side === 'long' ? 1 : -1;
    const realizedPnl = (finalPrice - position.entry_price) * position.quantity * pnlMultiplier * position.leverage;

    const { error } = await supabase
      .from('positions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        current_price: finalPrice,
        realized_pnl: (position.realized_pnl || 0) + realizedPnl,
        unrealized_pnl: 0
      })
      .eq('id', positionId);

    if (error) throw error;
    
    loadPositions();
  }, [positions, loadPositions]);

  // Update stop loss / take profit
  const updatePositionLevels = useCallback(async (
    positionId: string, 
    updates: { stop_loss?: number; take_profit?: number; trailing_stop_percent?: number }
  ) => {
    const { error } = await supabase
      .from('positions')
      .update(updates)
      .eq('id', positionId);

    if (error) throw error;
    loadPositions();
  }, [loadPositions]);

  return {
    positions,
    isLoading,
    error,
    userId,
    isConnected,
    totalUnrealizedPnl,
    totalRealizedPnl,
    totalPositionValue,
    totalMargin,
    loadPositions,
    closePosition,
    updatePositionLevels
  };
};
