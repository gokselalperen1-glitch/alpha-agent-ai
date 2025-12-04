import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimePrices } from './useRealtimePrices';

interface PortfolioItem {
  id: string;
  asset_symbol: string;
  quantity: number;
  average_buy_price: number | null;
  current_value: number | null;
  exchange_connection_id: string | null;
}

interface RealtimePortfolioValue {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
}

export const useRealtimePortfolio = (userId: string | undefined) => {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [realtimeValues, setRealtimeValues] = useState<RealtimePortfolioValue[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [totalPnLPercent, setTotalPnLPercent] = useState(0);
  const [loading, setLoading] = useState(true);

  // Get unique symbols from portfolio for price subscription
  const symbols = portfolioItems.map(p => `${p.asset_symbol.toLowerCase()}usdt`);
  
  const { prices, isConnected, getPrice } = useRealtimePrices({
    symbols: symbols.length > 0 ? symbols : ['btcusdt'],
    enabled: symbols.length > 0,
  });

  // Load portfolio items
  const loadPortfolio = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId);

    if (!error && data) {
      setPortfolioItems(data);
    }
    setLoading(false);
  }, [userId]);

  // Subscribe to portfolio changes
  useEffect(() => {
    if (!userId) return;

    loadPortfolio();

    const channel = supabase
      .channel('portfolio-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'portfolios',
        filter: `user_id=eq.${userId}`,
      }, () => {
        loadPortfolio();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadPortfolio]);

  // Update values when prices change
  useEffect(() => {
    if (portfolioItems.length === 0) {
      setRealtimeValues([]);
      setTotalValue(0);
      setTotalPnL(0);
      setTotalPnLPercent(0);
      return;
    }

    const updatedValues: RealtimePortfolioValue[] = portfolioItems.map(item => {
      const symbolKey = `${item.asset_symbol.toLowerCase()}usdt`;
      const priceData = getPrice(symbolKey.toUpperCase()) || getPrice(symbolKey);
      
      const currentPrice = priceData?.price || item.current_value || 0;
      const currentValue = item.quantity * currentPrice;
      const costBasis = item.average_buy_price ? item.quantity * item.average_buy_price : 0;
      const pnl = costBasis > 0 ? currentValue - costBasis : 0;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

      return {
        symbol: item.asset_symbol,
        quantity: item.quantity,
        avgPrice: item.average_buy_price || 0,
        currentPrice,
        currentValue,
        pnl,
        pnlPercent,
      };
    });

    setRealtimeValues(updatedValues);

    const newTotalValue = updatedValues.reduce((sum, v) => sum + v.currentValue, 0);
    const newTotalPnL = updatedValues.reduce((sum, v) => sum + v.pnl, 0);
    const totalCost = updatedValues.reduce((sum, v) => sum + (v.avgPrice * v.quantity), 0);
    const newTotalPnLPercent = totalCost > 0 ? (newTotalPnL / totalCost) * 100 : 0;

    setTotalValue(newTotalValue);
    setTotalPnL(newTotalPnL);
    setTotalPnLPercent(newTotalPnLPercent);
  }, [portfolioItems, prices, getPrice]);

  return {
    portfolioItems,
    realtimeValues,
    totalValue,
    totalPnL,
    totalPnLPercent,
    isConnected,
    loading,
    refresh: loadPortfolio,
  };
};
