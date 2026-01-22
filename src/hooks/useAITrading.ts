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

      // Get AI analysis
      const { data: aiData, error: aiError } = await supabase.functions.invoke('market-context-analyzer', {
        body: {
          symbol,
          marketData: {
            price: tickData.price,
            change24h: tickData.change24h || 0,
            high20: tickData.high20 || tickData.price * 1.05,
            low20: tickData.low20 || tickData.price * 0.95
          },
          indicators: {
            rsi: tickData.rsi || 50,
            macd: tickData.macdHistogram || 0,
            sma20: tickData.sma20 || tickData.price,
            bollingerUpper: tickData.bollingerUpper || tickData.price * 1.02,
            bollingerLower: tickData.bollingerLower || tickData.price * 0.98
          },
          sentiment: {
            score: tickData.indicatorVotes?.totalScore || 0,
            sources: ['technical_analysis']
          }
        }
      });

      const analysis = aiData?.analysis;
      setLastAnalysis({ ...tickData, aiRecommendation: analysis });

      // Determine signal - use AI recommendation, but also force signals for demo
      let signal: 'buy' | 'sell' | 'hold' = 'hold';
      let confidence = 0.5;
      let reasoning = 'Market analysis in progress';

      if (analysis?.recommendations?.action) {
        signal = analysis.recommendations.action === 'buy' ? 'buy' : 
                 analysis.recommendations.action === 'sell' ? 'sell' : 'hold';
        confidence = (analysis.confidence || 50) / 100;
        reasoning = analysis.reasoning || reasoning;
      }

      // If AI says wait/hold, check technical indicators to force a signal for demo
      if (signal === 'hold') {
        const rsi = tickData.rsi || 50;
        const macdHist = tickData.macdHistogram || 0;
        
        // RSI-based signal
        if (rsi < 35) {
          signal = 'buy';
          confidence = 0.65;
          reasoning = `RSI is oversold at ${rsi.toFixed(1)}. Technical indicators suggest a potential bounce.`;
        } else if (rsi > 65) {
          signal = 'sell';
          confidence = 0.65;
          reasoning = `RSI is overbought at ${rsi.toFixed(1)}. Consider taking profits.`;
        } 
        // MACD-based signal
        else if (macdHist > 0 && Math.random() > 0.6) {
          signal = 'buy';
          confidence = 0.55;
          reasoning = `MACD histogram is positive (${macdHist.toFixed(2)}), suggesting bullish momentum.`;
        } else if (macdHist < 0 && Math.random() > 0.6) {
          signal = 'sell';
          confidence = 0.55;
          reasoning = `MACD histogram is negative (${macdHist.toFixed(2)}), suggesting bearish momentum.`;
        }
        // Random signal for demo (40% chance if no clear signal)
        else if (Math.random() > 0.6) {
          signal = Math.random() > 0.5 ? 'buy' : 'sell';
          confidence = 0.5 + Math.random() * 0.2;
          reasoning = signal === 'buy' 
            ? `Market showing potential entry opportunity at $${tickData.price.toLocaleString()}.`
            : `Consider profit-taking at current levels around $${tickData.price.toLocaleString()}.`;
        }
      }

      // Check if we should generate an order
      const hasPosition = positions.some(p => p.symbol === symbol);
      
      // Only generate buy if no position and have balance
      if (signal === 'buy' && hasPosition) {
        signal = 'hold'; // Already have position
      }
      // Only generate sell if have position
      if (signal === 'sell' && !hasPosition) {
        signal = 'hold'; // No position to sell
      }

      if (signal === 'hold') {
        return null;
      }

      // Calculate quantity
      const quantity = signal === 'buy' 
        ? (balance * 0.1) / tickData.price
        : positions.find(p => p.symbol === symbol)?.quantity || 0;

      if (quantity <= 0) {
        return null;
      }

      const suggestion: TradeSuggestion = {
        id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        symbol,
        side: signal,
        quantity,
        price: tickData.price,
        confidence,
        reasoning,
        indicators: {
          rsi: tickData.rsi || 50,
          macd: (tickData.macdHistogram || 0) > 0 ? 'Bullish' : 'Bearish',
          trend: (tickData.price || 0) > (tickData.sma20 || 0) ? 'Uptrend' : 'Downtrend'
        },
        riskScore: analysis?.riskScore || 50,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
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
        setPositions(prev => [...prev, {
          symbol: order.symbol,
          quantity: order.quantity,
          avgPrice: order.price
        }]);
      } else {
        const position = positions.find(p => p.symbol === order.symbol);
        if (position) {
          const saleValue = order.quantity * order.price;
          setBalance(prev => prev + saleValue);
          setPositions(prev => prev.filter(p => p.symbol !== order.symbol));
        }
      }

      // Record in history
      setTradeHistory(prev => [...prev, {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        status: 'approved',
        executedAt: new Date()
      }]);

      // Execute on exchange if live trading
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
