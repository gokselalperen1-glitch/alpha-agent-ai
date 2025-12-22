import { useState, useEffect, useCallback, useMemo } from 'react';
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

interface ExchangeConnection {
  id: string;
  exchange_name: string;
  is_testnet: boolean;
}

interface RealtimePortfolioValue {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  exchangeName?: string;
}

export const useRealtimePortfolio = (userId: string | undefined) => {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [exchangeConnections, setExchangeConnections] = useState<ExchangeConnection[]>([]);
  const [realtimeValues, setRealtimeValues] = useState<RealtimePortfolioValue[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnL, setTotalPnL] = useState(0);
  const [totalPnLPercent, setTotalPnLPercent] = useState(0);
  const [loading, setLoading] = useState(true);

  // Get the exchange from connected accounts (default to binance)
  const primaryExchange = useMemo(() => {
    const conn = exchangeConnections.find(c => !c.is_testnet) || exchangeConnections[0];
    return conn?.exchange_name?.toLowerCase() || 'binance';
  }, [exchangeConnections]);

  // Memoize symbols to prevent infinite re-renders
  const symbols = useMemo(() => {
    if (portfolioItems.length === 0) return ['btcusdt', 'ethusdt'];
    return portfolioItems.map(p => `${p.asset_symbol.toLowerCase()}usdt`);
  }, [portfolioItems]);
  
  const { prices, isConnected, getPrice } = useRealtimePrices({
    symbols,
    exchange: primaryExchange,
    enabled: true,
  });

  // Load portfolio items and exchange connections
  const loadPortfolio = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Fetch portfolio items and exchange connections in parallel
    const [portfolioResult, connectionsResult] = await Promise.all([
      supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', userId),
      supabase
        .from('exchange_connections')
        .select('id, exchange_name, is_testnet')
        .eq('user_id', userId)
        .eq('is_active', true)
    ]);

    if (!portfolioResult.error && portfolioResult.data) {
      setPortfolioItems(portfolioResult.data);
    }

    if (!connectionsResult.error && connectionsResult.data) {
      setExchangeConnections(connectionsResult.data);
    }

    setLoading(false);
  }, [userId]);

  // Subscribe to portfolio changes
  useEffect(() => {
    if (!userId) return;

    loadPortfolio();

    const channel = supabase
      .channel(`portfolio-realtime-${userId}`)
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

    // Find exchange name for each portfolio item
    const getExchangeName = (connectionId: string | null) => {
      if (!connectionId) return undefined;
      return exchangeConnections.find(c => c.id === connectionId)?.exchange_name;
    };

    const updatedValues: RealtimePortfolioValue[] = portfolioItems.map(item => {
      const symbolKey = `${item.asset_symbol.toUpperCase()}USDT`;
      const priceData = getPrice(symbolKey);
      
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
        exchangeName: getExchangeName(item.exchange_connection_id),
      };
    });

    // Sort by value descending
    updatedValues.sort((a, b) => b.currentValue - a.currentValue);

    setRealtimeValues(updatedValues);

    const newTotalValue = updatedValues.reduce((sum, v) => sum + v.currentValue, 0);
    const newTotalPnL = updatedValues.reduce((sum, v) => sum + v.pnl, 0);
    const totalCost = updatedValues.reduce((sum, v) => sum + (v.avgPrice * v.quantity), 0);
    const newTotalPnLPercent = totalCost > 0 ? (newTotalPnL / totalCost) * 100 : 0;

    setTotalValue(newTotalValue);
    setTotalPnL(newTotalPnL);
    setTotalPnLPercent(newTotalPnLPercent);
  }, [portfolioItems, prices, getPrice, exchangeConnections]);

  return {
    portfolioItems,
    realtimeValues,
    totalValue,
    totalPnL,
    totalPnLPercent,
    isConnected,
    loading,
    refresh: loadPortfolio,
    exchangeConnections,
  };
};
