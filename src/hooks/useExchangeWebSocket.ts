import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TickerData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

interface TradeData {
  symbol: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

interface ExchangeData {
  channel: 'ticker' | 'trade';
  exchange: string;
  [key: string]: any;
}

interface UseExchangeWebSocketOptions {
  exchange?: string;
  symbols?: string[];
  channels?: ('ticker' | 'trade')[];
  enabled?: boolean;
}

export const useExchangeWebSocket = (options: UseExchangeWebSocketOptions = {}) => {
  const {
    exchange = 'binance',
    symbols = ['BTCUSDT', 'ETHUSDT'],
    channels = ['ticker'],
    enabled = true
  } = options;

  const [tickers, setTickers] = useState<Map<string, TickerData>>(new Map());
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token;

    const wsUrl = `wss://pqshhuhxvihsxyudcznx.supabase.co/functions/v1/exchange-websocket-manager`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        
        console.log('Connected to Exchange WebSocket Manager');
        setIsConnected(true);
        setError(null);

        // Authenticate
        if (authToken) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            authToken,
            exchange,
            symbols,
            channels
          }));
        }
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case 'connected':
              console.log('WebSocket ready:', message.message);
              break;

            case 'authenticated':
              setIsAuthenticated(true);
              console.log('WebSocket authenticated');
              break;

            case 'subscribed':
              console.log(`Subscribed to ${message.exchange}:`, message.symbols);
              break;

            case 'heartbeat':
              setLastHeartbeat(message.timestamp);
              // Reset heartbeat timeout
              if (heartbeatTimeoutRef.current) {
                clearTimeout(heartbeatTimeoutRef.current);
              }
              heartbeatTimeoutRef.current = setTimeout(() => {
                console.warn('Heartbeat timeout - connection may be stale');
                ws.close();
              }, 60000);
              break;

            case 'data':
              handleExchangeData(message as ExchangeData);
              break;

            case 'exchange_error':
              console.error(`Exchange error (${message.exchange}):`, message.message);
              setError(`${message.exchange}: ${message.message}`);
              break;

            case 'exchange_disconnected':
              console.log(`${message.exchange} disconnected`);
              break;

            case 'error':
              setError(message.message);
              break;
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        if (mountedRef.current) {
          setIsConnected(false);
          setIsAuthenticated(false);
          wsRef.current = null;

          // Attempt reconnection
          if (enabled) {
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
        setError('Connection error');
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      setError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [enabled, exchange, symbols, channels]);

  const handleExchangeData = (data: ExchangeData) => {
    if (data.channel === 'ticker') {
      setTickers(prev => {
        const newMap = new Map(prev);
        newMap.set(`${data.exchange}:${data.symbol}`, {
          symbol: data.symbol,
          price: data.price,
          priceChange: data.priceChange,
          priceChangePercent: data.priceChangePercent,
          high24h: data.high24h,
          low24h: data.low24h,
          volume24h: data.volume24h,
          timestamp: data.timestamp
        });
        return newMap;
      });
    } else if (data.channel === 'trade') {
      setTrades(prev => [
        {
          symbol: data.symbol,
          price: data.price,
          quantity: data.quantity,
          side: data.side,
          timestamp: data.timestamp
        },
        ...prev.slice(0, 99) // Keep last 100 trades
      ]);
    }
  };

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe' }));
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsAuthenticated(false);
  }, []);

  const subscribe = useCallback((newExchange: string, newSymbols: string[], newChannels: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        exchange: newExchange,
        symbols: newSymbols,
        channels: newChannels
      }));
    }
  }, []);

  const unsubscribe = useCallback((exchangeToUnsubscribe?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        exchange: exchangeToUnsubscribe
      }));
    }
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

  // Get ticker for a specific symbol
  const getTicker = useCallback((symbol: string, exch?: string): TickerData | undefined => {
    const key = `${exch || exchange}:${symbol}`;
    return tickers.get(key);
  }, [tickers, exchange]);

  // Get all tickers as array
  const tickerList = Array.from(tickers.values());

  return {
    tickers: tickerList,
    tickersMap: tickers,
    getTicker,
    trades,
    isConnected,
    isAuthenticated,
    error,
    lastHeartbeat,
    connect,
    disconnect,
    subscribe,
    unsubscribe
  };
};
