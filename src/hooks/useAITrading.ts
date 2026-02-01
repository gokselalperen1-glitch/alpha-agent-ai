import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TradeSuggestion {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  confidence: number;
  reasoning: string;
  indicators: {
    rsi: number;
    macd: string;
    trend: string;
  };
  riskScore: number;
  createdAt: Date;
  expiresAt: Date;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
}

export interface TradeHistoryItem {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  status: 'approved' | 'rejected';
  executedAt: Date;
}

interface UseAITradingProps {
  userId: string;
  initialBalance?: number;
}

export const useAITrading = ({ userId, initialBalance = 10000 }: UseAITradingProps) => {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [balance, setBalance] = useState(initialBalance);
  const [positions, setPositions] = useState<Position[]>([]);
  const [pendingOrders, setPendingOrders] = useState<TradeSuggestion[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);

  const analyzeMarket = useCallback(async (symbol: string): Promise<TradeSuggestion | null> => {
    if (isAnalyzing) return null;
    setIsAnalyzing(true);

    try {
      // Get market data from demo-agent-tick
      const { data: tickData, error: tickError } = await supabase.functions.invoke('demo-agent-tick', {
        body: { strategy: 'multi-indicator', symbol: symbol.split('/')[0] }
      });

      if (tickError) throw tickError;
      if (!tickData?.price) throw new Error('No price data received');

      setLastPrice(tickData.price);
      setLastAnalysis(tickData);

      const rsi = tickData.rsi ?? 50;
      const macdHist = tickData.macdHistogram ?? 0;
      const price = tickData.price;
      const sma20 = tickData.sma20 ?? price;

      // Determine signal based on technical indicators
      let signal: 'buy' | 'sell' = 'buy';
      let confidence = 0.6;
      let reasoning = '';

      // Strong RSI signals
      if (rsi < 30) {
        signal = 'buy';
        confidence = 0.75;
        reasoning = `RSI is oversold at ${rsi.toFixed(1)}. Strong buy signal.`;
      } else if (rsi > 70) {
        signal = 'sell';
        confidence = 0.75;
        reasoning = `RSI is overbought at ${rsi.toFixed(1)}. Strong sell signal.`;
      }
      // Moderate RSI signals
      else if (rsi < 40) {
        signal = 'buy';
        confidence = 0.65;
        reasoning = `RSI is low at ${rsi.toFixed(1)}. Buy opportunity detected.`;
      } else if (rsi > 60) {
        signal = 'sell';
        confidence = 0.65;
        reasoning = `RSI is high at ${rsi.toFixed(1)}. Consider taking profits.`;
      }
      // MACD signals for neutral RSI
      else if (macdHist > 50) {
        signal = 'buy';
        confidence = 0.6;
        reasoning = `MACD histogram positive (${macdHist.toFixed(0)}). Bullish momentum building.`;
      } else if (macdHist < -50) {
        signal = 'sell';
        confidence = 0.6;
        reasoning = `MACD histogram negative (${macdHist.toFixed(0)}). Bearish pressure increasing.`;
      }
      // Trend-based signals
      else if (price > sma20 * 1.02) {
        signal = 'buy';
        confidence = 0.55;
        reasoning = `Price above SMA20. Uptrend continuation expected.`;
      } else if (price < sma20 * 0.98) {
        signal = 'sell';
        confidence = 0.55;
        reasoning = `Price below SMA20. Downtrend may continue.`;
      }
      // Default: alternate for demo
      else {
        signal = Math.random() > 0.5 ? 'buy' : 'sell';
        confidence = 0.5;
        reasoning = `Market neutral. ${signal === 'buy' ? 'Looking for entry' : 'Watching for exit'} at $${price.toLocaleString()}.`;
      }

      // Check position constraints
      const hasPosition = positions.some(p => p.symbol === symbol);
      
      // Adjust signal based on current positions
      if (signal === 'sell' && !hasPosition) {
        // No position to sell, flip to buy
        signal = 'buy';
        reasoning = `No position to sell. ${reasoning} Converting to buy signal.`;
      }
      
      if (signal === 'buy' && hasPosition) {
        // Already have position, flip to sell to take profits
        signal = 'sell';
        reasoning = `Already holding ${symbol}. ${reasoning} Converting to sell signal.`;
      }

      // Calculate quantity
      const quantity = signal === 'buy' 
        ? Math.min((balance * 0.15) / price, balance * 0.5 / price)
        : positions.find(p => p.symbol === symbol)?.quantity || (balance * 0.1) / price;

      if (quantity <= 0 || (signal === 'buy' && balance < price * quantity)) {
        return null;
      }

      const suggestion: TradeSuggestion = {
        id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side: signal,
        quantity,
        price,
        confidence,
        reasoning,
        indicators: {
          rsi,
          macd: macdHist > 0 ? 'Bullish' : 'Bearish',
          trend: price > sma20 ? 'Uptrend' : 'Downtrend'
        },
        riskScore: Math.round(50 + (rsi - 50) * 0.5),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      return suggestion;

    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to analyze market',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, balance, positions, toast]);

  const addPendingOrder = useCallback((order: TradeSuggestion) => {
    setPendingOrders(prev => [...prev, order]);
  }, []);

  const removePendingOrder = useCallback((orderId: string) => {
    setPendingOrders(prev => prev.filter(o => o.id !== orderId));
  }, []);

  const approveOrder = useCallback(async (order: TradeSuggestion, isPaperTrading: boolean) => {
    try {
      if (order.side === 'buy') {
        const cost = order.quantity * order.price;
        if (cost > balance) {
          throw new Error('Insufficient balance');
        }
        setBalance(prev => prev - cost);
        setPositions(prev => {
          const existing = prev.find(p => p.symbol === order.symbol);
          if (existing) {
            return prev.map(p => p.symbol === order.symbol 
              ? { ...p, quantity: p.quantity + order.quantity, avgPrice: (p.avgPrice * p.quantity + order.price * order.quantity) / (p.quantity + order.quantity) }
              : p
            );
          }
          return [...prev, { symbol: order.symbol, quantity: order.quantity, avgPrice: order.price }];
        });
      } else {
        const position = positions.find(p => p.symbol === order.symbol);
        const sellQty = Math.min(order.quantity, position?.quantity || order.quantity);
        const saleValue = sellQty * order.price;
        setBalance(prev => prev + saleValue);
        
        if (position) {
          if (sellQty >= position.quantity) {
            setPositions(prev => prev.filter(p => p.symbol !== order.symbol));
          } else {
            setPositions(prev => prev.map(p => p.symbol === order.symbol 
              ? { ...p, quantity: p.quantity - sellQty }
              : p
            ));
          }
        }
      }

      setTradeHistory(prev => [...prev, {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        status: 'approved',
        executedAt: new Date()
      }]);

      if (!isPaperTrading) {
        await supabase.functions.invoke('advanced-trade-executor', {
          body: {
            symbol: order.symbol,
            side: order.side,
            orderType: 'market',
            quantity: order.quantity,
            isPaperTrading: false
          }
        });
      }

      removePendingOrder(order.id);

      toast({
        title: 'Order Executed',
        description: `${order.side.toUpperCase()} ${order.quantity.toFixed(6)} ${order.symbol} @ $${order.price.toLocaleString()}`
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Execution Failed',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [balance, positions, removePendingOrder, toast]);

  const rejectOrder = useCallback((order: TradeSuggestion) => {
    setTradeHistory(prev => [...prev, {
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      price: order.price,
      status: 'rejected',
      executedAt: new Date()
    }]);
    removePendingOrder(order.id);
    
    toast({
      title: 'Order Rejected',
      description: `Skipped ${order.side} ${order.symbol}`
    });
  }, [removePendingOrder, toast]);

  const expireOldOrders = useCallback(() => {
    const now = new Date();
    setPendingOrders(prev => prev.filter(o => now < o.expiresAt));
  }, []);

  const calculatePortfolioValue = useCallback(() => {
    const positionsValue = positions.reduce((sum, p) => {
      const currentPrice = lastPrice || p.avgPrice;
      return sum + (p.quantity * currentPrice);
    }, 0);
    return balance + positionsValue;
  }, [balance, positions, lastPrice]);

  return {
    isAnalyzing,
    balance,
    positions,
    pendingOrders,
    tradeHistory,
    lastPrice,
    lastAnalysis,
    analyzeMarket,
    addPendingOrder,
    approveOrder,
    rejectOrder,
    expireOldOrders,
    calculatePortfolioValue
  };
};
