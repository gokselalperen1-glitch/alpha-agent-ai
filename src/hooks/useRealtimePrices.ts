import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

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
  const mountedRef = useRef(true);

  // Stabilize symbols array to prevent infinite reconnections
  const symbolsKey = useMemo(() => symbols.join(','), [symbols]);
  const stableSymbols = useMemo(() => symbols, [symbolsKey]);

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    const wsUrl = `wss://pqshhuhxvihsxyudcznx.functions.supabase.co/functions/v1/realtime-prices`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        console.log('Connected to real-time prices');
        setIsConnected(true);
        setError(null);
        
        // Subscribe to price updates
        ws.send(JSON.stringify({
          type: 'subscribe',
          exchange,
          symbols: stableSymbols,
        }));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
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
        if (mountedRef.current) {
          setIsConnected(false);
          wsRef.current = null;
          
          // Attempt to reconnect after 5 seconds
          if (enabled && mountedRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                console.log('Attempting to reconnect...');
                connect();
              }
            }, 5000);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (mountedRef.current) {
          setError('Connection error');
        }
      };
    } catch (error: any) {
      console.error('Failed to connect:', error);
      if (mountedRef.current) {
        setError(error.message);
      }
    }
  }, [enabled, exchange, stableSymbols]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'unsubscribe' }));
        }
        wsRef.current.close();
      } catch (e) {
        // Ignore errors during cleanup
      }
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Helper to get price for a specific symbol
  const getPrice = useCallback((symbol: string, exch?: string): PriceUpdate | undefined => {
    const targetExchange = exch || exchange;
    // Try exact match first
    const exactKey = `${targetExchange}:${symbol}`;
    if (prices.has(exactKey)) {
      return prices.get(exactKey);
    }
    // Try uppercase
    const upperKey = `${targetExchange}:${symbol.toUpperCase()}`;
    if (prices.has(upperKey)) {
      return prices.get(upperKey);
    }
    // Try lowercase
    const lowerKey = `${targetExchange}:${symbol.toLowerCase()}`;
    return prices.get(lowerKey);
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
