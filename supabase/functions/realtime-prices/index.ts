import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Exchange WebSocket endpoints
const EXCHANGE_WS_URLS: Record<string, string> = {
  binance: 'wss://stream.binance.com:9443/ws',
  coinbase: 'wss://ws-feed.exchange.coinbase.com',
  kraken: 'wss://ws.kraken.com',
  bybit: 'wss://stream.bybit.com/v5/public/spot',
  kucoin: 'wss://ws-api-spot.kucoin.com',
};

interface PriceUpdate {
  exchange: string;
  symbol: string;
  price: number;
  volume24h?: number;
  change24h?: number;
  timestamp: string;
}

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check for WebSocket upgrade
  if (upgradeHeader.toLowerCase() !== "websocket") {
    // REST endpoint for getting current prices
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { symbols, exchange } = await req.json();
      
      // Fetch prices using CCXT
      const ccxtLib = await import('https://esm.sh/ccxt@4.2.25');
      const exchangeId = (exchange || 'binance').toLowerCase();
      const ExchangeClass = (ccxtLib as any)[exchangeId];
      
      if (!ExchangeClass) {
        throw new Error(`Exchange ${exchange} not supported`);
      }

      const exchangeInstance = new ExchangeClass({ enableRateLimit: true });
      const tickers = await exchangeInstance.fetchTickers(symbols || ['BTC/USDT', 'ETH/USDT']);

      const prices: PriceUpdate[] = Object.entries(tickers).map(([symbol, ticker]: [string, any]) => ({
        exchange: exchangeId,
        symbol,
        price: ticker.last || 0,
        volume24h: ticker.baseVolume || 0,
        change24h: ticker.percentage || 0,
        timestamp: new Date().toISOString(),
      }));

      return new Response(
        JSON.stringify({ success: true, prices }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error: any) {
      console.error('Price fetch error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // WebSocket upgrade for real-time streaming
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let exchangeSockets: WebSocket[] = [];
  let heartbeatInterval: number | undefined;

  socket.onopen = () => {
    console.log('Client connected to real-time price feed');
    
    // Send heartbeat every 30 seconds
    heartbeatInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() }));
      }
    }, 30000);
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'subscribe') {
        const { exchange, symbols } = message;
        const wsUrl = EXCHANGE_WS_URLS[exchange?.toLowerCase() || 'binance'];
        
        if (!wsUrl) {
          socket.send(JSON.stringify({ type: 'error', message: `Exchange ${exchange} not supported` }));
          return;
        }

        // Connect to exchange WebSocket based on exchange type
        if (exchange?.toLowerCase() === 'binance') {
          await subscribeToBinance(socket, symbols || ['btcusdt', 'ethusdt']);
        } else {
          // Fallback to polling for other exchanges
          await startPolling(socket, exchange, symbols || ['BTC/USDT', 'ETH/USDT']);
        }
        
        socket.send(JSON.stringify({ 
          type: 'subscribed', 
          exchange, 
          symbols,
          timestamp: new Date().toISOString() 
        }));
      }
      
      if (message.type === 'unsubscribe') {
        // Close exchange connections
        exchangeSockets.forEach(ws => ws.close());
        exchangeSockets = [];
        socket.send(JSON.stringify({ type: 'unsubscribed', timestamp: new Date().toISOString() }));
      }
    } catch (error: any) {
      console.error('Message handling error:', error);
      socket.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  };

  socket.onclose = () => {
    console.log('Client disconnected');
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    exchangeSockets.forEach(ws => ws.close());
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  // Binance WebSocket subscription
  async function subscribeToBinance(clientSocket: WebSocket, symbols: string[]) {
    const streams = symbols.map(s => `${s.toLowerCase()}@ticker`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    
    const binanceWs = new WebSocket(wsUrl);
    exchangeSockets.push(binanceWs);
    
    binanceWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.data) {
          const ticker = data.data;
          const update: PriceUpdate = {
            exchange: 'binance',
            symbol: ticker.s,
            price: parseFloat(ticker.c),
            volume24h: parseFloat(ticker.v),
            change24h: parseFloat(ticker.P),
            timestamp: new Date().toISOString(),
          };
          
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({ type: 'price', data: update }));
          }
        }
      } catch (error) {
        console.error('Binance parse error:', error);
      }
    };
    
    binanceWs.onerror = (error) => {
      console.error('Binance WebSocket error:', error);
    };
  }

  // Polling fallback for exchanges without easy WebSocket support
  async function startPolling(clientSocket: WebSocket, exchange: string, symbols: string[]) {
    const ccxtLib = await import('https://esm.sh/ccxt@4.2.25');
    const ExchangeClass = (ccxtLib as any)[exchange.toLowerCase()];
    
    if (!ExchangeClass) return;
    
    const exchangeInstance = new ExchangeClass({ enableRateLimit: true });
    
    const poll = async () => {
      try {
        const tickers = await exchangeInstance.fetchTickers(symbols);
        
        for (const [symbol, ticker] of Object.entries(tickers) as [string, any][]) {
          const update: PriceUpdate = {
            exchange,
            symbol,
            price: ticker.last || 0,
            volume24h: ticker.baseVolume || 0,
            change24h: ticker.percentage || 0,
            timestamp: new Date().toISOString(),
          };
          
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({ type: 'price', data: update }));
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };
    
    // Poll every 5 seconds
    const intervalId = setInterval(poll, 5000);
    poll(); // Initial fetch
    
    // Store interval for cleanup
    (exchangeSockets as any).pollInterval = intervalId;
  }

  return response;
});
