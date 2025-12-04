import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PriceUpdate {
  exchange: string;
  symbol: string;
  price: number;
  volume24h?: number;
  change24h?: number;
  timestamp: string;
}

interface UseRealtimePricesOptions {
  exchange?: string;
  symbols?: string[];
  enabled?: boolean;
}

export const useRealtimePrices = (options: UseRealtimePricesOptions = {}) => {
  const { exchange = 'binance', symbols = ['btcusdt', 'ethusdt'], enabled = true } = options;
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `wss://pqshhuhxvihsxyudcznx.functions.supabase.co/functions/v1/realtime-prices`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to real-time prices');
        setIsConnected(true);
        setError(null);
        
        // Subscribe to price updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          exchange,
          symbols,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'price') {
            const update = message.data as PriceUpdate;
            setPrices(prev => {
              const newMap = new Map(prev);
              newMap.set(`${update.exchange}:${update.symbol}`, update);
              return newMap;
            });
          } else if (message.type === 'heartbeat') {
            // Connection is alive
          } else if (message.type === 'error') {
            setError(message.message);
          }
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from real-time prices');
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect after 5 seconds
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, 5000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error');
      };
    } catch (error: any) {
      console.error('Failed to connect:', error);
      setError(error.message);
    }
  }, [enabled, exchange, symbols]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe' }));
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Helper to get price for a specific symbol
  const getPrice = useCallback((symbol: string, exch?: string): PriceUpdate | undefined => {
    const key = `${exch || exchange}:${symbol}`;
    return prices.get(key);
  }, [prices, exchange]);

  // Get all prices as array
  const priceList = Array.from(prices.values());

  return {
    prices: priceList,
    pricesMap: prices,
    getPrice,
    isConnected,
    error,
    connect,
    disconnect,
  };
};
