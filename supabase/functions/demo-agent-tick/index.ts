import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
}

interface TickResult {
  symbol: string;
  price: number;
  change24h: number;
  rsi: number;
  sma20: number;
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  timestamp: string;
}

// Calculate RSI from price history
function calculateRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
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

// Calculate SMA
function calculateSMA(prices: number[], period = 20): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Generate signal based on strategy
function generateSignal(
  strategy: string,
  price: number,
  rsi: number,
  sma20: number,
  change24h: number
): { signal: 'buy' | 'sell' | 'hold'; confidence: number; reasoning: string } {
  
  switch (strategy) {
    case 'safe-growth': {
      // RSI-based strategy
      if (rsi < 30) {
        return {
          signal: 'buy',
          confidence: Math.min(0.9, (30 - rsi) / 30 + 0.5),
          reasoning: `RSI at ${rsi.toFixed(1)} indicates oversold conditions. Strong buy signal.`
        };
      } else if (rsi > 70) {
        return {
          signal: 'sell',
          confidence: Math.min(0.9, (rsi - 70) / 30 + 0.5),
          reasoning: `RSI at ${rsi.toFixed(1)} indicates overbought conditions. Consider taking profits.`
        };
      }
      return {
        signal: 'hold',
        confidence: 0.6,
        reasoning: `RSI at ${rsi.toFixed(1)} is neutral. Waiting for better entry point.`
      };
    }
    
    case 'trend-follower': {
      // SMA-based trend following
      const aboveSMA = price > sma20;
      const smaDistance = ((price - sma20) / sma20) * 100;
      
      if (aboveSMA && change24h > 0) {
        return {
          signal: 'buy',
          confidence: Math.min(0.85, 0.5 + smaDistance / 10),
          reasoning: `Price ${smaDistance.toFixed(1)}% above SMA20 with positive momentum. Trend is bullish.`
        };
      } else if (!aboveSMA && change24h < 0) {
        return {
          signal: 'sell',
          confidence: Math.min(0.85, 0.5 + Math.abs(smaDistance) / 10),
          reasoning: `Price ${Math.abs(smaDistance).toFixed(1)}% below SMA20 with negative momentum. Trend is bearish.`
        };
      }
      return {
        signal: 'hold',
        confidence: 0.5,
        reasoning: `Mixed signals. Price vs SMA: ${smaDistance.toFixed(1)}%. Waiting for trend confirmation.`
      };
    }
    
    case 'momentum': {
      // Aggressive momentum strategy
      if (change24h > 3) {
        return {
          signal: 'buy',
          confidence: Math.min(0.9, 0.6 + change24h / 20),
          reasoning: `Strong momentum: +${change24h.toFixed(1)}% in 24h. Riding the wave.`
        };
      } else if (change24h < -3) {
        return {
          signal: 'sell',
          confidence: Math.min(0.9, 0.6 + Math.abs(change24h) / 20),
          reasoning: `Negative momentum: ${change24h.toFixed(1)}% in 24h. Cutting losses.`
        };
      }
      return {
        signal: 'hold',
        confidence: 0.4,
        reasoning: `Low momentum: ${change24h.toFixed(1)}% change. Waiting for breakout.`
      };
    }
    
    default:
      return { signal: 'hold', confidence: 0.5, reasoning: 'Unknown strategy' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: { strategy?: string; symbol?: string } = {};
    try {
      const text = await req.text();
      if (text && text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      // Use defaults
    }
    
    const strategy = body.strategy || 'safe-growth';
    const symbol = body.symbol || 'BTC';
    
    console.log(`Demo tick: ${symbol} with ${strategy} strategy`);
    
    // Fetch real price from CoinGecko (free, no API key)
    const coinId = symbol === 'BTC' ? 'bitcoin' : symbol === 'ETH' ? 'ethereum' : 'bitcoin';
    
    const priceResponse = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_high=true&include_24hr_low=true`
    );
    
    let price = symbol === 'BTC' ? 95000 : 3500;
    let change24h = 0;
    
    if (priceResponse.ok) {
      const priceData = await priceResponse.json();
      if (priceData[coinId]) {
        price = priceData[coinId].usd || price;
        change24h = priceData[coinId].usd_24h_change || 0;
      }
    }
    
    // Generate simulated price history for RSI calculation
    // In production, you'd fetch actual historical data
    const priceHistory: number[] = [];
    for (let i = 20; i >= 0; i--) {
      // Simulate slight price variations based on current price and change
      const variation = (Math.random() - 0.5) * (price * 0.02);
      const historicalPrice = price - (change24h / 24 * i) + variation;
      priceHistory.push(historicalPrice);
    }
    priceHistory.push(price); // Current price
    
    const rsi = calculateRSI(priceHistory);
    const sma20 = calculateSMA(priceHistory);
    
    const { signal, confidence, reasoning } = generateSignal(strategy, price, rsi, sma20, change24h);
    
    const result: TickResult = {
      symbol,
      price,
      change24h,
      rsi,
      sma20,
      signal,
      confidence,
      reasoning,
      timestamp: new Date().toISOString()
    };
    
    console.log(`Signal: ${signal} (${(confidence * 100).toFixed(0)}%)`);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Demo tick error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
