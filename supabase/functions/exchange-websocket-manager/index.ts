import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExchangeConnection {
  id: string;
  exchange_name: string;
  api_key_encrypted: string;
  api_secret_encrypted: string;
  passphrase_encrypted?: string;
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  channels?: string[];
  symbols?: string[];
  exchange?: string;
}

// Exchange WebSocket URLs
const EXCHANGE_WS_URLS: Record<string, string> = {
  binance: 'wss://stream.binance.com:9443/ws',
  binance_futures: 'wss://fstream.binance.com/ws',
  bybit: 'wss://stream.bybit.com/v5/public/linear',
  okx: 'wss://ws.okx.com:8443/ws/v5/public',
  kraken: 'wss://ws.kraken.com',
  kucoin: 'wss://ws-api-spot.kucoin.com',
};

// Active connections per user
const userConnections = new Map<string, Map<string, WebSocket>>();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgradeHeader = req.headers.get("Upgrade") || "";
  
  if (upgradeHeader.toLowerCase() !== "websocket") {
    // REST endpoint for connection status
    return new Response(
      JSON.stringify({ 
        status: 'ok',
        activeConnections: userConnections.size,
        supportedExchanges: Object.keys(EXCHANGE_WS_URLS)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // WebSocket upgrade
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  let userId: string | null = null;
  let exchangeConnections: Map<string, WebSocket> = new Map();
  let heartbeatInterval: number | null = null;

  socket.onopen = () => {
    console.log('Client connected to exchange WebSocket manager');
    
    // Send connection confirmation
    socket.send(JSON.stringify({ 
      type: 'connected',
      message: 'Exchange WebSocket Manager ready'
    }));
    
    // Start heartbeat
    heartbeatInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
      }
    }, 30000);
  };

  socket.onmessage = async (event) => {
    try {
      const message: WebSocketMessage & { userId?: string; authToken?: string } = JSON.parse(event.data);
      console.log('Received message:', message.type);

      if (message.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        return;
      }

      // Authenticate user if not already
      if (!userId && message.authToken) {
        const { data: { user }, error } = await supabase.auth.getUser(message.authToken);
        if (!error && user) {
          userId = user.id;
          console.log('User authenticated:', userId);
          
          // Store user connections
          userConnections.set(userId, exchangeConnections);
          
          socket.send(JSON.stringify({ 
            type: 'authenticated',
            userId 
          }));
        } else {
          socket.send(JSON.stringify({ 
            type: 'error',
            message: 'Authentication failed'
          }));
          return;
        }
      }

      if (message.type === 'subscribe' && userId) {
        await handleSubscribe(socket, supabase, userId, message, exchangeConnections);
      }

      if (message.type === 'unsubscribe') {
        handleUnsubscribe(exchangeConnections, message.exchange);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      socket.send(JSON.stringify({ 
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  socket.onclose = () => {
    console.log('Client disconnected');
    
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    // Close all exchange connections
    exchangeConnections.forEach((ws, exchange) => {
      console.log(`Closing ${exchange} connection`);
      ws.close();
    });
    exchangeConnections.clear();
    
    if (userId) {
      userConnections.delete(userId);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return response;
});

async function handleSubscribe(
  clientSocket: WebSocket,
  supabase: any,
  userId: string,
  message: WebSocketMessage,
  exchangeConnections: Map<string, WebSocket>
) {
  const exchange = message.exchange || 'binance';
  const symbols = message.symbols || ['BTCUSDT', 'ETHUSDT'];
  const channels = message.channels || ['ticker', 'trade'];

  console.log(`Subscribing to ${exchange} for symbols:`, symbols);

  // Get user's exchange connection for private channels
  const { data: connections } = await supabase
    .from('exchange_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('exchange_name', exchange)
    .eq('is_active', true)
    .limit(1);

  const connection = connections?.[0];

  // Close existing connection to this exchange
  if (exchangeConnections.has(exchange)) {
    exchangeConnections.get(exchange)?.close();
  }

  // Create exchange-specific WebSocket
  const wsUrl = getExchangeWebSocketUrl(exchange, symbols, channels);
  
  try {
    const exchangeWs = new WebSocket(wsUrl);
    exchangeConnections.set(exchange, exchangeWs);

    exchangeWs.onopen = () => {
      console.log(`Connected to ${exchange} WebSocket`);
      
      // Send subscription message based on exchange
      const subMessage = getSubscriptionMessage(exchange, symbols, channels);
      if (subMessage) {
        exchangeWs.send(JSON.stringify(subMessage));
      }
      
      clientSocket.send(JSON.stringify({
        type: 'subscribed',
        exchange,
        symbols,
        channels
      }));
    };

    exchangeWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const normalizedData = normalizeExchangeData(exchange, data);
        
        if (normalizedData) {
          clientSocket.send(JSON.stringify({
            type: 'data',
            exchange,
            ...normalizedData
          }));
        }
      } catch (e) {
        // Handle non-JSON messages (some exchanges send ping/pong as text)
      }
    };

    exchangeWs.onerror = (error) => {
      console.error(`${exchange} WebSocket error:`, error);
      clientSocket.send(JSON.stringify({
        type: 'exchange_error',
        exchange,
        message: 'Connection error'
      }));
    };

    exchangeWs.onclose = () => {
      console.log(`${exchange} WebSocket closed`);
      exchangeConnections.delete(exchange);
      clientSocket.send(JSON.stringify({
        type: 'exchange_disconnected',
        exchange
      }));
    };

  } catch (error) {
    console.error(`Failed to connect to ${exchange}:`, error);
    clientSocket.send(JSON.stringify({
      type: 'error',
      message: `Failed to connect to ${exchange}`
    }));
  }
}

function handleUnsubscribe(
  exchangeConnections: Map<string, WebSocket>,
  exchange?: string
) {
  if (exchange && exchangeConnections.has(exchange)) {
    exchangeConnections.get(exchange)?.close();
    exchangeConnections.delete(exchange);
  } else if (!exchange) {
    exchangeConnections.forEach(ws => ws.close());
    exchangeConnections.clear();
  }
}

function getExchangeWebSocketUrl(exchange: string, symbols: string[], channels: string[]): string {
  switch (exchange) {
    case 'binance':
      // Binance uses combined streams
      const streams = symbols.flatMap(s => 
        channels.map(c => `${s.toLowerCase()}@${c}`)
      ).join('/');
      return `wss://stream.binance.com:9443/stream?streams=${streams}`;
    
    case 'binance_futures':
      const futuresStreams = symbols.flatMap(s => 
        channels.map(c => `${s.toLowerCase()}@${c}`)
      ).join('/');
      return `wss://fstream.binance.com/stream?streams=${futuresStreams}`;
    
    case 'bybit':
      return 'wss://stream.bybit.com/v5/public/linear';
    
    case 'okx':
      return 'wss://ws.okx.com:8443/ws/v5/public';
    
    case 'kraken':
      return 'wss://ws.kraken.com';
    
    default:
      return EXCHANGE_WS_URLS[exchange] || EXCHANGE_WS_URLS.binance;
  }
}

function getSubscriptionMessage(exchange: string, symbols: string[], channels: string[]): object | null {
  switch (exchange) {
    case 'bybit':
      return {
        op: 'subscribe',
        args: symbols.flatMap(s => channels.map(c => `${c}.${s}`))
      };
    
    case 'okx':
      return {
        op: 'subscribe',
        args: symbols.flatMap(s => channels.map(c => ({
          channel: c,
          instId: s
        })))
      };
    
    case 'kraken':
      return {
        event: 'subscribe',
        pair: symbols,
        subscription: { name: channels[0] || 'ticker' }
      };
    
    case 'binance':
    case 'binance_futures':
      // Binance subscription is done via URL
      return null;
    
    default:
      return null;
  }
}

function normalizeExchangeData(exchange: string, data: any): object | null {
  try {
    switch (exchange) {
      case 'binance':
      case 'binance_futures':
        if (data.data?.e === '24hrTicker' || data.e === '24hrTicker') {
          const ticker = data.data || data;
          return {
            channel: 'ticker',
            symbol: ticker.s,
            price: parseFloat(ticker.c),
            priceChange: parseFloat(ticker.p),
            priceChangePercent: parseFloat(ticker.P),
            high24h: parseFloat(ticker.h),
            low24h: parseFloat(ticker.l),
            volume24h: parseFloat(ticker.v),
            quoteVolume24h: parseFloat(ticker.q),
            timestamp: ticker.E
          };
        }
        if (data.data?.e === 'trade' || data.e === 'trade') {
          const trade = data.data || data;
          return {
            channel: 'trade',
            symbol: trade.s,
            price: parseFloat(trade.p),
            quantity: parseFloat(trade.q),
            side: trade.m ? 'sell' : 'buy',
            timestamp: trade.T
          };
        }
        break;

      case 'bybit':
        if (data.topic?.includes('ticker')) {
          const ticker = data.data;
          return {
            channel: 'ticker',
            symbol: ticker.symbol,
            price: parseFloat(ticker.lastPrice),
            priceChange: parseFloat(ticker.price24hPcnt) * 100,
            high24h: parseFloat(ticker.highPrice24h),
            low24h: parseFloat(ticker.lowPrice24h),
            volume24h: parseFloat(ticker.volume24h),
            timestamp: data.ts
          };
        }
        break;

      case 'okx':
        if (data.arg?.channel === 'tickers' && data.data?.[0]) {
          const ticker = data.data[0];
          return {
            channel: 'ticker',
            symbol: ticker.instId,
            price: parseFloat(ticker.last),
            priceChange: parseFloat(ticker.sodUtc8),
            high24h: parseFloat(ticker.high24h),
            low24h: parseFloat(ticker.low24h),
            volume24h: parseFloat(ticker.vol24h),
            timestamp: parseInt(ticker.ts)
          };
        }
        break;
    }
  } catch (e) {
    console.error('Error normalizing data:', e);
  }
  
  return null;
}
