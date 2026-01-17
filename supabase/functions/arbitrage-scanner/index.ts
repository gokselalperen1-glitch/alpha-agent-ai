import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArbitrageOpportunity {
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spreadPercent: number;
  estimatedProfit: number;
  volumeAvailable: number;
}

// Supported exchanges for arbitrage scanning
const EXCHANGES = ['binance', 'coinbase', 'kraken', 'bybit', 'okx', 'kucoin'];

// Common trading pairs to scan
const TRADING_PAIRS = [
  'BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'XRP/USDT', 'SOL/USDT',
  'ADA/USDT', 'AVAX/USDT', 'DOGE/USDT', 'DOT/USDT', 'MATIC/USDT'
];

// Minimum spread to consider (accounts for fees + slippage)
const MIN_SPREAD_PERCENT = 0.5;

// Opportunity expiry time (30 seconds)
const OPPORTUNITY_EXPIRY_MS = 30000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { action, symbols } = await req.json();

    if (action === 'scan') {
      const opportunities = await scanForArbitrage(symbols || TRADING_PAIRS);
      
      // Store opportunities in database
      if (opportunities.length > 0) {
        const expiresAt = new Date(Date.now() + OPPORTUNITY_EXPIRY_MS);
        
        const records = opportunities.map(opp => ({
          symbol: opp.symbol,
          buy_exchange: opp.buyExchange,
          sell_exchange: opp.sellExchange,
          buy_price: opp.buyPrice,
          sell_price: opp.sellPrice,
          spread_percent: opp.spreadPercent,
          estimated_profit: opp.estimatedProfit,
          volume_available: opp.volumeAvailable,
          expires_at: expiresAt.toISOString(),
          status: 'active'
        }));

        await supabase.from('arbitrage_opportunities').insert(records);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          opportunities,
          scannedAt: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_active') {
      // Get active (non-expired) opportunities
      const { data: opportunities } = await supabase
        .from('arbitrage_opportunities')
        .select('*')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('spread_percent', { ascending: false })
        .limit(20);

      return new Response(
        JSON.stringify({ 
          success: true, 
          opportunities: opportunities || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'execute') {
      // Execute arbitrage trade
      const { opportunityId, quantity, userId } = await req.json();
      
      const result = await executeArbitrage(supabase, opportunityId, quantity, userId);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('Arbitrage scanner error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function scanForArbitrage(symbols: string[]): Promise<ArbitrageOpportunity[]> {
  console.log('Scanning for arbitrage opportunities...');
  const ccxtLib = await import('https://esm.sh/ccxt@4.2.25');
  
  const opportunities: ArbitrageOpportunity[] = [];
  const priceMap = new Map<string, Map<string, { bid: number; ask: number; volume: number }>>();

  // Fetch prices from all exchanges in parallel
  const fetchPromises = EXCHANGES.map(async (exchangeName) => {
    try {
      const ExchangeClass = (ccxtLib.default as any)[exchangeName];
      if (!ExchangeClass) return;

      const exchange = new ExchangeClass({ enableRateLimit: true });
      await exchange.loadMarkets();

      for (const symbol of symbols) {
        try {
          // Check if exchange supports this symbol
          if (!exchange.markets[symbol]) continue;

          const ticker = await exchange.fetchTicker(symbol);
          
          if (!priceMap.has(symbol)) {
            priceMap.set(symbol, new Map());
          }
          
          priceMap.get(symbol)!.set(exchangeName, {
            bid: ticker.bid || 0,
            ask: ticker.ask || 0,
            volume: ticker.baseVolume || 0
          });
        } catch (e) {
          // Symbol not available on this exchange
        }
      }
    } catch (e) {
      console.error(`Error fetching from ${exchangeName}:`, e);
    }
  });

  await Promise.all(fetchPromises);

  // Find arbitrage opportunities
  for (const [symbol, exchangePrices] of priceMap) {
    const exchanges = Array.from(exchangePrices.entries());
    
    for (let i = 0; i < exchanges.length; i++) {
      for (let j = 0; j < exchanges.length; j++) {
        if (i === j) continue;

        const [buyExchange, buyData] = exchanges[i];
        const [sellExchange, sellData] = exchanges[j];

        // Buy at ask price, sell at bid price
        const buyPrice = buyData.ask;
        const sellPrice = sellData.bid;

        if (buyPrice <= 0 || sellPrice <= 0) continue;

        const spreadPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

        if (spreadPercent >= MIN_SPREAD_PERCENT) {
          // Calculate estimated profit (assuming $1000 trade)
          const tradeAmount = 1000;
          const quantity = tradeAmount / buyPrice;
          const buyTotal = quantity * buyPrice;
          const sellTotal = quantity * sellPrice;
          
          // Assume 0.1% fees on each side
          const buyFees = buyTotal * 0.001;
          const sellFees = sellTotal * 0.001;
          const estimatedProfit = sellTotal - buyTotal - buyFees - sellFees;

          if (estimatedProfit > 0) {
            opportunities.push({
              symbol,
              buyExchange,
              sellExchange,
              buyPrice,
              sellPrice,
              spreadPercent,
              estimatedProfit,
              volumeAvailable: Math.min(buyData.volume, sellData.volume)
            });
          }
        }
      }
    }
  }

  // Sort by spread percentage
  opportunities.sort((a, b) => b.spreadPercent - a.spreadPercent);
  
  console.log(`Found ${opportunities.length} arbitrage opportunities`);
  return opportunities.slice(0, 10); // Return top 10
}

async function executeArbitrage(
  supabase: any,
  opportunityId: string,
  quantity: number,
  userId: string
) {
  // Get the opportunity
  const { data: opportunity, error } = await supabase
    .from('arbitrage_opportunities')
    .select('*')
    .eq('id', opportunityId)
    .single();

  if (error || !opportunity) {
    throw new Error('Opportunity not found');
  }

  if (opportunity.status !== 'active' || new Date(opportunity.expires_at) < new Date()) {
    throw new Error('Opportunity has expired');
  }

  // Get user's exchange connections
  const { data: connections } = await supabase
    .from('exchange_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('exchange_name', [opportunity.buy_exchange, opportunity.sell_exchange]);

  if (!connections || connections.length < 2) {
    throw new Error(`You need active connections to both ${opportunity.buy_exchange} and ${opportunity.sell_exchange}`);
  }

  const buyConnection = connections.find((c: any) => c.exchange_name === opportunity.buy_exchange);
  const sellConnection = connections.find((c: any) => c.exchange_name === opportunity.sell_exchange);

  if (!buyConnection || !sellConnection) {
    throw new Error('Missing required exchange connections');
  }

  // Mark opportunity as being executed
  await supabase
    .from('arbitrage_opportunities')
    .update({ status: 'executed' })
    .eq('id', opportunityId);

  // Execute trades via the advanced trade executor
  const baseUrl = Deno.env.get('SUPABASE_URL');
  
  // Execute buy order
  const buyResponse = await fetch(`${baseUrl}/functions/v1/advanced-trade-executor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      symbol: opportunity.symbol,
      side: 'buy',
      orderType: 'market',
      quantity,
      exchangeConnectionId: buyConnection.id,
      isPaperTrading: false
    })
  });

  const buyResult = await buyResponse.json();

  if (!buyResult.success) {
    throw new Error(`Buy order failed: ${buyResult.error}`);
  }

  // Execute sell order
  const sellResponse = await fetch(`${baseUrl}/functions/v1/advanced-trade-executor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      symbol: opportunity.symbol,
      side: 'sell',
      orderType: 'market',
      quantity,
      exchangeConnectionId: sellConnection.id,
      isPaperTrading: false
    })
  });

  const sellResult = await sellResponse.json();

  if (!sellResult.success) {
    // Buy succeeded but sell failed - need to handle this
    console.error('Arbitrage sell failed:', sellResult.error);
    return {
      success: false,
      partialExecution: true,
      buyResult,
      sellError: sellResult.error
    };
  }

  // Calculate actual profit
  const actualProfit = (sellResult.executedPrice - buyResult.executedPrice) * quantity 
    - (buyResult.fees || 0) - (sellResult.fees || 0);

  return {
    success: true,
    opportunityId,
    symbol: opportunity.symbol,
    quantity,
    buyExchange: opportunity.buy_exchange,
    sellExchange: opportunity.sell_exchange,
    buyPrice: buyResult.executedPrice,
    sellPrice: sellResult.executedPrice,
    buyFees: buyResult.fees,
    sellFees: sellResult.fees,
    actualProfit,
    spreadPercent: opportunity.spread_percent
  };
}
