import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface APIRequest {
  provider: 'polygon' | 'alphavantage' | 'finnhub' | 'stocktwits';
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

    const authHeader = req.headers.get('Authorization')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    let result;

    switch (provider) {
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

async function handlePolygon(action: string, params: any) {
  const apiKey = Deno.env.get('POLYGON_API_KEY');
  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not configured');
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
    throw new Error('ALPHAVANTAGE_API_KEY not configured');
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
    throw new Error('FINNHUB_API_KEY not configured');
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
      const response = await fetch(
        `${baseUrl}/streams/symbol/${symbol}.json`
      );
      return await response.json();
    }

    case 'trending': {
      const response = await fetch(`${baseUrl}/trending/symbols.json`);
      return await response.json();
    }

    default:
      throw new Error(`Unknown StockTwits action: ${action}`);
  }
}
