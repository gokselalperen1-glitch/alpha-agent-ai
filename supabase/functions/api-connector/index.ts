import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface APIRequest {
  provider: 'polygon' | 'alphavantage' | 'finnhub' | 'stocktwits' | 'ccxt';
  action: string;
  params: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, action, params }: APIRequest = await req.json();
    console.log(`API Connector: ${provider} - ${action}`, params);

    // Check for internal service call (from other edge functions)
    const authHeader = req.headers.get('Authorization');
    const isInternalCall = authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    
    if (!isInternalCall && authHeader) {
      // Verify user auth for external calls
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Unauthorized');
      }
    }

    let result;

    switch (provider) {
      case 'ccxt':
        result = await handleCCXT(action, params);
        break;
      case 'polygon':
        result = await handlePolygon(action, params);
        break;
      case 'alphavantage':
        result = await handleAlphaVantage(action, params);
        break;
      case 'finnhub':
        result = await handleFinnhub(action, params);
        break;
      case 'stocktwits':
        result = await handleStockTwits(action, params);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('API Connector Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// CCXT handler for real-time market data (no API key needed for public data)
async function handleCCXT(action: string, params: any) {
  const ccxtLib = await import('https://esm.sh/ccxt@4.2.25');
  
  const exchangeName = params.exchange || 'binance';
  const ExchangeClass = (ccxtLib as any)[exchangeName.toLowerCase()];
  
  if (!ExchangeClass) {
    throw new Error(`Exchange ${exchangeName} not supported`);
  }
  
  const exchange = new ExchangeClass({
    enableRateLimit: true,
    sandbox: params.testnet || false,
  });

  switch (action) {
    case 'ticker': {
      const ticker = await exchange.fetchTicker(params.symbol || 'BTC/USDT');
      return {
        symbol: ticker.symbol,
        price: ticker.last,
        high24h: ticker.high,
        low24h: ticker.low,
        volume: ticker.baseVolume,
        change24h: ticker.percentage,
        bid: ticker.bid,
        ask: ticker.ask,
        timestamp: new Date(ticker.timestamp).toISOString(),
      };
    }
    
    case 'ohlcv': {
      const candles = await exchange.fetchOHLCV(
        params.symbol || 'BTC/USDT',
        params.timeframe || '1h',
        undefined,
        params.limit || 100
      );
      return candles.map((c: any) => ({
        timestamp: new Date(c[0]).toISOString(),
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5],
      }));
    }
    
    case 'orderbook': {
      const orderbook = await exchange.fetchOrderBook(params.symbol || 'BTC/USDT', params.limit || 20);
      return {
        bids: orderbook.bids.slice(0, 10),
        asks: orderbook.asks.slice(0, 10),
        timestamp: new Date().toISOString(),
      };
    }
    
    case 'markets': {
      const markets = await exchange.loadMarkets();
      const symbols = Object.keys(markets).slice(0, 100);
      return { symbols, count: Object.keys(markets).length };
    }

    case 'technical-indicators': {
      // Calculate basic indicators from OHLCV data
      const candles = await exchange.fetchOHLCV(
        params.symbol || 'BTC/USDT',
        params.timeframe || '1h',
        undefined,
        100
      );
      
      const closes = candles.map((c: any) => c[4]);
      
      // Simple RSI calculation
      const rsi = calculateRSI(closes, params.period || 14);
      
      // Simple SMA
      const sma20 = calculateSMA(closes, 20);
      const sma50 = calculateSMA(closes, 50);
      
      // Simple EMA
      const ema12 = calculateEMA(closes, 12);
      const ema26 = calculateEMA(closes, 26);
      
      // MACD
      const macd = ema12 - ema26;
      
      return {
        symbol: params.symbol || 'BTC/USDT',
        rsi: rsi,
        sma20: sma20,
        sma50: sma50,
        ema12: ema12,
        ema26: ema26,
        macd: macd,
        price: closes[closes.length - 1],
        timestamp: new Date().toISOString(),
      };
    }
    
    default:
      throw new Error(`Unknown CCXT action: ${action}`);
  }
}

// Technical indicator calculations
function calculateRSI(prices: number[], period: number): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  
  return ema;
}

async function handlePolygon(action: string, params: any) {
  const apiKey = Deno.env.get('POLYGON_API_KEY');
  if (!apiKey) {
    // Fallback to CCXT for market data
    return handleCCXT('ticker', { symbol: params.symbol, exchange: 'binance' });
  }

  const baseUrl = 'https://api.polygon.io';

  switch (action) {
    case 'quote': {
      const { symbol } = params;
      const response = await fetch(
        `${baseUrl}/v2/aggs/ticker/${symbol}/prev?apiKey=${apiKey}`
      );
      return await response.json();
    }

    case 'aggregates': {
      const { symbol, timeframe, from, to } = params;
      const response = await fetch(
        `${baseUrl}/v2/aggs/ticker/${symbol}/range/1/${timeframe}/${from}/${to}?apiKey=${apiKey}`
      );
      return await response.json();
    }

    default:
      throw new Error(`Unknown Polygon action: ${action}`);
  }
}

async function handleAlphaVantage(action: string, params: any) {
  const apiKey = Deno.env.get('ALPHAVANTAGE_API_KEY');
  if (!apiKey) {
    // Fallback to CCXT for technical indicators
    return handleCCXT('technical-indicators', params);
  }

  const baseUrl = 'https://www.alphavantage.co/query';

  switch (action) {
    case 'technical-indicator': {
      const { symbol, indicator, interval, time_period } = params;
      const functionMap: Record<string, string> = {
        rsi: 'RSI',
        macd: 'MACD',
        sma: 'SMA',
        ema: 'EMA',
        bbands: 'BBANDS',
      };

      const response = await fetch(
        `${baseUrl}?function=${functionMap[indicator]}&symbol=${symbol}&interval=${interval}&time_period=${time_period || 14}&apikey=${apiKey}`
      );
      return await response.json();
    }

    case 'quote': {
      const { symbol } = params;
      const response = await fetch(
        `${baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
      );
      return await response.json();
    }

    case 'fundamentals': {
      const { symbol } = params;
      const response = await fetch(
        `${baseUrl}?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`
      );
      return await response.json();
    }

    default:
      throw new Error(`Unknown Alpha Vantage action: ${action}`);
  }
}

async function handleFinnhub(action: string, params: any) {
  const apiKey = Deno.env.get('FINNHUB_API_KEY');
  if (!apiKey) {
    // Return mock data when no API key
    return { message: 'FINNHUB_API_KEY not configured', data: null };
  }

  const baseUrl = 'https://finnhub.io/api/v1';

  switch (action) {
    case 'quote': {
      const { symbol } = params;
      const response = await fetch(
        `${baseUrl}/quote?symbol=${symbol}&token=${apiKey}`
      );
      return await response.json();
    }

    case 'company-profile': {
      const { symbol } = params;
      const response = await fetch(
        `${baseUrl}/stock/profile2?symbol=${symbol}&token=${apiKey}`
      );
      return await response.json();
    }

    case 'news': {
      const { symbol, from, to } = params;
      const response = await fetch(
        `${baseUrl}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${apiKey}`
      );
      return await response.json();
    }

    case 'basic-financials': {
      const { symbol } = params;
      const response = await fetch(
        `${baseUrl}/stock/metric?symbol=${symbol}&metric=all&token=${apiKey}`
      );
      return await response.json();
    }

    default:
      throw new Error(`Unknown Finnhub action: ${action}`);
  }
}

async function handleStockTwits(action: string, params: any) {
  const baseUrl = 'https://api.stocktwits.com/api/2';

  switch (action) {
    case 'stream': {
      const { symbol } = params;
      try {
        const response = await fetch(
          `${baseUrl}/streams/symbol/${symbol}.json`
        );
        return await response.json();
      } catch {
        return { messages: [], symbol };
      }
    }

    case 'trending': {
      try {
        const response = await fetch(`${baseUrl}/trending/symbols.json`);
        return await response.json();
      } catch {
        return { symbols: [] };
      }
    }

    default:
      throw new Error(`Unknown StockTwits action: ${action}`);
  }
}
