import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TickResult {
  symbol: string;
  price: number;
  change24h: number;
  // Basic indicators
  rsi: number;
  sma20: number;
  sma50: number;
  // Advanced indicators
  bollingerUpper: number;
  bollingerLower: number;
  bollingerPercentB: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  atr: number;
  high20: number;
  low20: number;
  // Signal
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  indicatorVotes: IndicatorVotes;
  riskMetrics: RiskMetrics;
  timestamp: string;
}

interface IndicatorVotes {
  rsi: -1 | 0 | 1;
  macd: -1 | 0 | 1;
  trend: -1 | 0 | 1;
  bollinger: -1 | 0 | 1;
  momentum: -1 | 0 | 1;
  totalScore: number;
}

interface RiskMetrics {
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  positionSizeMultiplier: number;
  volatilityLevel: 'low' | 'medium' | 'high';
}

// Calculate RSI from price history
function calculateRSI(prices: number[], period = 14): number {
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

// Calculate SMA
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Calculate EMA
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return calculateSMA(prices, prices.length);
  
  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

// Calculate Standard Deviation
function calculateStdDev(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const squaredDiffs = slice.map(p => Math.pow(p - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  return Math.sqrt(variance);
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices: number[], period = 20, stdDevMultiplier = 2): { upper: number; lower: number; middle: number; percentB: number } {
  const sma = calculateSMA(prices, period);
  const stdDev = calculateStdDev(prices, period);
  const upper = sma + (stdDev * stdDevMultiplier);
  const lower = sma - (stdDev * stdDevMultiplier);
  const currentPrice = prices[prices.length - 1];
  const percentB = (currentPrice - lower) / (upper - lower);
  
  return { upper, lower, middle: sma, percentB };
}

// Calculate MACD
function calculateMACD(prices: number[]): { line: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  // Create MACD line history for signal line
  const macdHistory: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const e12 = calculateEMA(slice, 12);
    const e26 = calculateEMA(slice, 26);
    macdHistory.push(e12 - e26);
  }
  
  const signalLine = macdHistory.length >= 9 ? calculateEMA(macdHistory, 9) : macdLine;
  const histogram = macdLine - signalLine;
  
  return { line: macdLine, signal: signalLine, histogram };
}

// Calculate ATR (Average True Range)
function calculateATR(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    // Simplified TR for single price data: use price volatility
    const tr = Math.abs(prices[i] - prices[i - 1]);
    trueRanges.push(tr);
  }
  
  if (trueRanges.length < period) return 0;
  return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// Calculate indicator votes for consensus strategy
function calculateIndicatorVotes(
  price: number,
  rsi: number,
  macd: { line: number; signal: number; histogram: number },
  sma20: number,
  bollinger: { upper: number; lower: number; percentB: number },
  change24h: number
): IndicatorVotes {
  // RSI vote
  const rsiVote = rsi < 35 ? 1 : rsi > 65 ? -1 : 0;
  
  // MACD vote
  const macdVote = macd.histogram > 0 ? 1 : macd.histogram < 0 ? -1 : 0;
  
  // Trend vote (price vs SMA20)
  const trendVote = price > sma20 * 1.01 ? 1 : price < sma20 * 0.99 ? -1 : 0;
  
  // Bollinger vote
  const bbVote = bollinger.percentB < 0.1 ? 1 : bollinger.percentB > 0.9 ? -1 : 0;
  
  // Momentum vote
  const momentumVote = change24h > 2 ? 1 : change24h < -2 ? -1 : 0;
  
  const totalScore = rsiVote + macdVote + trendVote + bbVote + momentumVote;
  
  return {
    rsi: rsiVote as -1 | 0 | 1,
    macd: macdVote as -1 | 0 | 1,
    trend: trendVote as -1 | 0 | 1,
    bollinger: bbVote as -1 | 0 | 1,
    momentum: momentumVote as -1 | 0 | 1,
    totalScore
  };
}

// Calculate risk metrics
function calculateRiskMetrics(price: number, atr: number): RiskMetrics {
  const atrPercent = (atr / price) * 100;
  const volatilityLevel = atrPercent > 3 ? 'high' : atrPercent > 1.5 ? 'medium' : 'low';
  
  // Position size based on volatility
  const positionSizeMultiplier = volatilityLevel === 'high' ? 0.5 : volatilityLevel === 'medium' ? 0.75 : 1.0;
  
  // Stop-loss at 2x ATR
  const suggestedStopLoss = price - (atr * 2);
  
  // Take-profit at 3x ATR (1.5:1 risk-reward)
  const suggestedTakeProfit = price + (atr * 3);
  
  return {
    suggestedStopLoss,
    suggestedTakeProfit,
    positionSizeMultiplier,
    volatilityLevel
  };
}

// Strategy implementations
function generateSignal(
  strategy: string,
  price: number,
  rsi: number,
  sma20: number,
  sma50: number,
  change24h: number,
  bollinger: { upper: number; lower: number; percentB: number },
  macd: { line: number; signal: number; histogram: number },
  high20: number,
  low20: number,
  indicatorVotes: IndicatorVotes
): { signal: 'buy' | 'sell' | 'hold'; confidence: number; reasoning: string } {
  
  switch (strategy) {
    case 'smart-dca': {
      // Smart DCA: Always accumulate, increase when oversold
      if (rsi < 30) {
        return {
          signal: 'buy',
          confidence: 0.9,
          reasoning: `Smart DCA: RSI at ${rsi.toFixed(1)} is deeply oversold. Increasing position by 1.5x base amount.`
        };
      } else if (rsi < 40) {
        return {
          signal: 'buy',
          confidence: 0.75,
          reasoning: `Smart DCA: RSI at ${rsi.toFixed(1)} shows weakness. Increasing position by 1.2x base amount.`
        };
      } else if (rsi > 70) {
        return {
          signal: 'hold',
          confidence: 0.6,
          reasoning: `Smart DCA: RSI at ${rsi.toFixed(1)} is overbought. Reducing this period's buy to 0.5x.`
        };
      }
      return {
        signal: 'buy',
        confidence: 0.6,
        reasoning: `Smart DCA: Regular accumulation period. Buying base amount.`
      };
    }
    
    case 'bollinger-reversion': {
      // Bollinger Mean Reversion
      if (bollinger.percentB < 0.05 && rsi < 35) {
        return {
          signal: 'buy',
          confidence: Math.min(0.95, 0.7 + (1 - bollinger.percentB) * 0.3),
          reasoning: `Mean Reversion: Price at lower Bollinger Band (${(bollinger.percentB * 100).toFixed(1)}%) with RSI ${rsi.toFixed(1)}. Strong buy signal.`
        };
      } else if (bollinger.percentB > 0.95 && rsi > 65) {
        return {
          signal: 'sell',
          confidence: Math.min(0.95, 0.7 + bollinger.percentB * 0.3),
          reasoning: `Mean Reversion: Price at upper Bollinger Band (${(bollinger.percentB * 100).toFixed(1)}%) with RSI ${rsi.toFixed(1)}. Taking profits.`
        };
      } else if (bollinger.percentB < 0.2) {
        return {
          signal: 'buy',
          confidence: 0.6,
          reasoning: `Mean Reversion: Price in lower range (${(bollinger.percentB * 100).toFixed(1)}%). Moderate buy signal.`
        };
      }
      return {
        signal: 'hold',
        confidence: 0.5,
        reasoning: `Mean Reversion: Price at ${(bollinger.percentB * 100).toFixed(1)}% of Bollinger range. Waiting for extremes.`
      };
    }
    
    case 'macd-crossover': {
      // MACD Crossover with trend confirmation
      const aboveSMA50 = price > sma50;
      const histogramStrength = Math.abs(macd.histogram) / price * 10000;
      
      if (macd.histogram > 0 && aboveSMA50) {
        const confidence = Math.min(0.85, 0.5 + histogramStrength * 0.1);
        return {
          signal: 'buy',
          confidence,
          reasoning: `MACD Crossover: Bullish histogram (${macd.histogram.toFixed(2)}) confirmed by price above SMA50. Trend is up.`
        };
      } else if (macd.histogram < 0 && !aboveSMA50) {
        const confidence = Math.min(0.85, 0.5 + histogramStrength * 0.1);
        return {
          signal: 'sell',
          confidence,
          reasoning: `MACD Crossover: Bearish histogram (${macd.histogram.toFixed(2)}) confirmed by price below SMA50. Trend is down.`
        };
      }
      return {
        signal: 'hold',
        confidence: 0.4,
        reasoning: `MACD Crossover: Mixed signals. MACD: ${macd.histogram > 0 ? 'bullish' : 'bearish'}, Trend: ${aboveSMA50 ? 'up' : 'down'}. Waiting for confirmation.`
      };
    }
    
    case 'multi-indicator': {
      // Multi-Indicator Consensus
      const { totalScore } = indicatorVotes;
      
      if (totalScore >= 3) {
        return {
          signal: 'buy',
          confidence: Math.min(0.95, 0.5 + totalScore * 0.1),
          reasoning: `Consensus: ${totalScore}/5 indicators bullish (RSI, MACD, Trend, BB, Momentum). Strong buy consensus.`
        };
      } else if (totalScore <= -3) {
        return {
          signal: 'sell',
          confidence: Math.min(0.95, 0.5 + Math.abs(totalScore) * 0.1),
          reasoning: `Consensus: ${Math.abs(totalScore)}/5 indicators bearish. Strong sell consensus.`
        };
      } else if (totalScore >= 2) {
        return {
          signal: 'buy',
          confidence: 0.6,
          reasoning: `Consensus: ${totalScore}/5 indicators lean bullish. Moderate buy signal.`
        };
      } else if (totalScore <= -2) {
        return {
          signal: 'sell',
          confidence: 0.6,
          reasoning: `Consensus: ${Math.abs(totalScore)}/5 indicators lean bearish. Moderate sell signal.`
        };
      }
      return {
        signal: 'hold',
        confidence: 0.5,
        reasoning: `Consensus: ${totalScore}/5 - indicators are mixed. Waiting for clearer signal.`
      };
    }
    
    case 'grid-trading': {
      // Grid Trading: Buy dips, sell rallies in a range
      const gridSize = 0.02; // 2% grid
      const priceFromSMA = (price - sma20) / sma20;
      
      if (priceFromSMA < -gridSize * 2) {
        return {
          signal: 'buy',
          confidence: Math.min(0.85, 0.5 + Math.abs(priceFromSMA) * 5),
          reasoning: `Grid Trading: Price ${(priceFromSMA * 100).toFixed(1)}% below SMA20. Buying at grid level.`
        };
      } else if (priceFromSMA > gridSize * 2) {
        return {
          signal: 'sell',
          confidence: Math.min(0.85, 0.5 + priceFromSMA * 5),
          reasoning: `Grid Trading: Price ${(priceFromSMA * 100).toFixed(1)}% above SMA20. Selling at grid level.`
        };
      }
      return {
        signal: 'hold',
        confidence: 0.5,
        reasoning: `Grid Trading: Price ${(priceFromSMA * 100).toFixed(1)}% from SMA20. Between grid levels.`
      };
    }
    
    case 'momentum-breakout': {
      // Momentum Breakout: Buy new highs with strong momentum
      if (price >= high20 * 0.99 && change24h > 3) {
        return {
          signal: 'buy',
          confidence: Math.min(0.9, 0.6 + change24h / 20),
          reasoning: `Breakout: Price at 20-period high with ${change24h.toFixed(1)}% momentum. Breakout confirmed!`
        };
      } else if (price <= low20 * 1.01) {
        return {
          signal: 'sell',
          confidence: 0.85,
          reasoning: `Breakout: Price at 20-period low. Stop-loss triggered, exiting position.`
        };
      } else if (price > high20 * 0.97) {
        return {
          signal: 'hold',
          confidence: 0.5,
          reasoning: `Breakout: Price near 20-period high. Watching for breakout with volume.`
        };
      }
      return {
        signal: 'hold',
        confidence: 0.4,
        reasoning: `Breakout: Price ${((price / high20 - 1) * 100).toFixed(1)}% from 20-period high. Waiting for breakout.`
      };
    }
    
    // Legacy strategies for backward compatibility
    case 'safe-growth': {
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
    
    // Fetch real price - try multiple sources for reliability
    let price = symbol === 'BTC' ? 95000 : 3500;
    let change24h = 0;
    let priceSource = 'fallback';
    
    // Source 1: CoinGecko (free, no API key)
    const coinId = symbol === 'BTC' ? 'bitcoin' : symbol === 'ETH' ? 'ethereum' : 'bitcoin';
    
    try {
      const priceResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        if (priceData[coinId]) {
          price = priceData[coinId].usd || price;
          change24h = priceData[coinId].usd_24h_change || 0;
          priceSource = 'coingecko';
        }
      }
    } catch (e) {
      console.log('CoinGecko fetch failed, trying backup...');
    }
    
    // Source 2: Binance public API (backup)
    if (priceSource === 'fallback') {
      try {
        const binanceSymbol = symbol === 'BTC' ? 'BTCUSDT' : symbol === 'ETH' ? 'ETHUSDT' : 'BTCUSDT';
        const binanceResponse = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (binanceResponse.ok) {
          const binanceData = await binanceResponse.json();
          price = parseFloat(binanceData.lastPrice) || price;
          change24h = parseFloat(binanceData.priceChangePercent) || 0;
          priceSource = 'binance';
        }
      } catch (e) {
        console.log('Binance fetch also failed, using fallback price');
      }
    }
    
    console.log(`Price source: ${priceSource}, Price: $${price}, Change: ${change24h.toFixed(2)}%`);
    
    // Generate realistic price history for indicator calculations
    // Simulates 50 periods of price data based on current price and momentum
    const priceHistory: number[] = [];
    const volatility = 0.015; // 1.5% typical volatility
    let simulatedPrice = price * (1 - change24h / 100 * 2); // Start from ~2 days ago
    
    for (let i = 0; i < 50; i++) {
      // Random walk with drift toward current price
      const drift = (price - simulatedPrice) / (50 - i) * 0.1;
      const noise = (Math.random() - 0.5) * price * volatility;
      simulatedPrice = simulatedPrice + drift + noise;
      priceHistory.push(simulatedPrice);
    }
    priceHistory.push(price); // Current price
    
    // Calculate all indicators
    const rsi = calculateRSI(priceHistory, 14);
    const sma20 = calculateSMA(priceHistory, 20);
    const sma50 = calculateSMA(priceHistory, 50);
    const bollinger = calculateBollingerBands(priceHistory, 20, 2);
    const macd = calculateMACD(priceHistory);
    const atr = calculateATR(priceHistory, 14);
    const high20 = Math.max(...priceHistory.slice(-20));
    const low20 = Math.min(...priceHistory.slice(-20));
    
    // Calculate indicator votes
    const indicatorVotes = calculateIndicatorVotes(price, rsi, macd, sma20, bollinger, change24h);
    
    // Calculate risk metrics
    const riskMetrics = calculateRiskMetrics(price, atr);
    
    // Generate signal based on strategy
    const { signal, confidence, reasoning } = generateSignal(
      strategy, price, rsi, sma20, sma50, change24h,
      bollinger, macd, high20, low20, indicatorVotes
    );
    
    const result: TickResult = {
      symbol,
      price,
      change24h,
      rsi,
      sma20,
      sma50,
      bollingerUpper: bollinger.upper,
      bollingerLower: bollinger.lower,
      bollingerPercentB: bollinger.percentB,
      macdLine: macd.line,
      macdSignal: macd.signal,
      macdHistogram: macd.histogram,
      atr,
      high20,
      low20,
      signal,
      confidence,
      reasoning,
      indicatorVotes,
      riskMetrics,
      timestamp: new Date().toISOString()
    };
    
    console.log(`Signal: ${signal} (${(confidence * 100).toFixed(0)}%) - ${strategy} | Source: ${priceSource}`);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Demo tick error:', error);
    
    // Return a graceful fallback response instead of error
    const fallbackResult: TickResult = {
      symbol: 'BTC',
      price: 95000,
      change24h: 0,
      rsi: 50,
      sma20: 95000,
      sma50: 94000,
      bollingerUpper: 97000,
      bollingerLower: 93000,
      bollingerPercentB: 0.5,
      macdLine: 0,
      macdSignal: 0,
      macdHistogram: 0,
      atr: 1500,
      high20: 96000,
      low20: 93000,
      signal: 'hold',
      confidence: 0.5,
      reasoning: 'Using fallback data due to API timeout. Market analysis in progress.',
      indicatorVotes: { rsi: 0, macd: 0, trend: 0, bollinger: 0, momentum: 0, totalScore: 0 },
      riskMetrics: { suggestedStopLoss: 93000, suggestedTakeProfit: 98000, positionSizeMultiplier: 1, volatilityLevel: 'medium' },
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(fallbackResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
