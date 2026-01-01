import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SAFETY_RULES } from "../_shared/exchange-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecutionContext {
  nodeOutputs: Map<string, any>;
  workflowState: Record<string, any>;
  userId: string;
  agentId: string;
  executionId: string;
  isPaperTrading: boolean;
}

interface WorkflowNode {
  id: string;
  type: string;
  data: {
    label: string;
    type: string;
    config: any;
  };
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

// Topological sort to determine execution order
function buildExecutionPlan(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const graph = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // Initialize graph
  nodes.forEach(node => {
    graph.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // Build adjacency list and in-degrees
  edges.forEach(edge => {
    graph.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Kahn's algorithm for topological sort
  const queue: string[] = [];
  const executionOrder: string[] = [];

  // Start with nodes that have no dependencies
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) queue.push(nodeId);
  });

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    executionOrder.push(nodeId);

    graph.get(nodeId)?.forEach(targetId => {
      const newDegree = (inDegree.get(targetId) || 0) - 1;
      inDegree.set(targetId, newDegree);
      if (newDegree === 0) queue.push(targetId);
    });
  }

  return executionOrder;
}

// Node execution handlers
async function executeNode(
  node: WorkflowNode,
  context: ExecutionContext,
  supabase: any
): Promise<any> {
  console.log(`Executing node ${node.id} of type ${node.type}`);

  try {
    let result;
    
    switch (node.type) {
      case 'schedule-trigger':
        result = await executeScheduleTrigger(node, context);
        break;
      case 'market-data':
        result = await executeMarketData(node, context, supabase);
        break;
      case 'technical-indicators':
        result = await executeTechnicalIndicators(node, context, supabase);
        break;
      case 'sentiment-analysis':
        result = await executeSentimentAnalysis(node, context, supabase);
        break;
      case 'news-monitor':
        result = await executeNewsMonitor(node, context, supabase);
        break;
      case 'fundamental-analysis':
        result = await executeFundamentalAnalysis(node, context, supabase);
        break;
      case 'ai-risk-assessment':
        result = await executeAIRiskAssessment(node, context, supabase);
        break;
      case 'execute-trade':
        result = await executeTradeNode(node, context, supabase);
        break;
      case 'send-alert':
        result = await executeSendAlert(node, context, supabase);
        break;
      case 'if-condition':
        result = await executeCondition(node, context);
        break;
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }

    // Store node output
    context.nodeOutputs.set(node.id, result);
    
    // Log execution
    await logNodeExecution(context.executionId, node, 'success', result, supabase);
    
    return result;
  } catch (error: any) {
    console.error(`Error executing node ${node.id}:`, error);
    await logNodeExecution(context.executionId, node, 'error', error.message, supabase);
    throw error;
  }
}

async function executeScheduleTrigger(node: WorkflowNode, context: ExecutionContext) {
  return {
    triggeredAt: new Date().toISOString(),
    triggerType: 'schedule',
    config: node.data.config,
  };
}

// Market Data Node - Fetch real-time market data using CCXT
async function executeMarketData(node: WorkflowNode, context: ExecutionContext, supabase: any) {
  console.log('Executing Market Data node:', node.data.label);
  
  try {
    // Import CCXT dynamically
    const ccxtLib = await import('https://esm.sh/ccxt@4.2.25');
    
    // Get symbol from node config or use default
    const symbol = node.data.config?.symbol || 'BTC/USDT';
    const exchangeName = node.data.config?.exchange || 'binance';
    
    // Initialize exchange (using public API, no credentials needed for market data)
    const ExchangeClass = (ccxtLib as any)[exchangeName.toLowerCase()];
    if (!ExchangeClass) {
      throw new Error(`Exchange ${exchangeName} not supported`);
    }
    
    const exchange = new ExchangeClass({
      enableRateLimit: true,
    });
    
    // Fetch ticker data
    const ticker = await exchange.fetchTicker(symbol);
    
    const marketData = {
      symbol,
      exchange: exchangeName,
      price: ticker.last || 0,
      high24h: ticker.high || 0,
      low24h: ticker.low || 0,
      volume: ticker.baseVolume || 0,
      change24h: ticker.percentage || 0,
      bid: ticker.bid || 0,
      ask: ticker.ask || 0,
      timestamp: new Date(ticker.timestamp || Date.now()).toISOString(),
    };

    await logNodeExecution(context.executionId, node, 'completed', {
      dataFetched: marketData,
    }, supabase);

    return marketData;
  } catch (error: any) {
    console.error('Market data fetch error:', error);
    
    await logNodeExecution(context.executionId, node, 'failed', {
      error: error.message,
    }, supabase);
    
    throw error;
  }
}

// Technical Indicators Node - Calculate indicators using CCXT data
async function executeTechnicalIndicators(
  node: WorkflowNode,
  context: ExecutionContext,
  supabase: any
) {
  console.log('Executing Technical Indicators node:', node.data.label);
  
  try {
    const symbol = node.data.config?.symbol || 'BTC/USDT';
    const exchangeName = node.data.config?.exchange || 'binance';
    const timeframe = node.data.config?.interval || '1h';
    
    // Use CCXT directly for technical indicators
    const ccxtLib = await import('https://esm.sh/ccxt@4.2.25');
    const ExchangeClass = (ccxtLib as any)[exchangeName.toLowerCase()];
    
    if (!ExchangeClass) {
      throw new Error(`Exchange ${exchangeName} not supported`);
    }
    
    const exchange = new ExchangeClass({ enableRateLimit: true });
    const candles = await exchange.fetchOHLCV(symbol, timeframe, undefined, 100);
    
    const closes = candles.map((c: any) => c[4]);
    
    // Calculate indicators
    const rsi = calculateRSI(closes, 14);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macd = ema12 - ema26;
    
    const result = {
      symbol,
      exchange: exchangeName,
      timeframe,
      rsi,
      sma20,
      sma50,
      ema12,
      ema26,
      macd,
      price: closes[closes.length - 1],
      timestamp: new Date().toISOString()
    };
    
    console.log('Technical indicators calculated:', result);
    return result;
  } catch (error: any) {
    console.error('Technical indicators fetch error:', error);
    throw error;
  }
}

// Helper functions for technical indicators
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

// Sentiment Analysis Node - Analyze sentiment using AI
async function executeSentimentAnalysis(
  node: WorkflowNode,
  context: ExecutionContext,
  supabase: any
) {
  console.log('Executing Sentiment Analysis node:', node.data.label);
  
  try {
    const symbol = node.data.config?.symbol || 'BTC';
    
    // Get market data from context for sentiment basis
    const marketData = Array.from(context.nodeOutputs.values())
      .find(output => output?.price) || { price: 0, change24h: 0 };
    
    // Use AI for sentiment analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (LOVABLE_API_KEY) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: 'You are a crypto market sentiment analyst. Analyze the symbol and recent price action to determine market sentiment. Return JSON with: sentimentScore (-1 to 1), sentiment (bullish/bearish/neutral), confidence (0-100), reasoning (short).' 
            },
            { 
              role: 'user', 
              content: `Analyze sentiment for ${symbol}. Current price: $${marketData.price}, 24h change: ${marketData.change24h}%` 
            }
          ],
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        try {
          const parsed = JSON.parse(content);
          return {
            symbol,
            sentimentScore: parsed.sentimentScore || 0,
            sentiment: parsed.sentiment || 'neutral',
            confidence: parsed.confidence || 50,
            reasoning: parsed.reasoning || 'AI analysis completed',
            timestamp: new Date().toISOString()
          };
        } catch {
          // Parse failed, use defaults
        }
      }
    }
    
    // Fallback: derive sentiment from price change
    const sentimentScore = marketData.change24h > 2 ? 0.6 : 
                          marketData.change24h < -2 ? -0.6 : 0;
    
    return {
      symbol,
      sentimentScore,
      sentiment: sentimentScore > 0 ? 'bullish' : sentimentScore < 0 ? 'bearish' : 'neutral',
      confidence: 60,
      reasoning: `Based on ${marketData.change24h?.toFixed(2)}% price change`,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Sentiment analysis error:', error);
    return {
      symbol: node.data.config?.symbol || 'BTC',
      sentimentScore: 0,
      sentiment: 'neutral',
      confidence: 0,
      reasoning: 'Analysis failed',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// News Monitor Node - Use AI to generate market news summary
async function executeNewsMonitor(
  node: WorkflowNode,
  context: ExecutionContext,
  supabase: any
) {
  console.log('Executing News Monitor node:', node.data.label);
  
  try {
    const symbol = node.data.config?.symbol || 'BTC';
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (LOVABLE_API_KEY) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: 'You are a financial news analyst. Provide a brief market news summary. Return JSON with: headlines (array of 3 short headlines), marketTrend (bullish/bearish/neutral), keyEvents (array of 2 key events), impact (positive/negative/neutral).' 
            },
            { 
              role: 'user', 
              content: `Provide current market news and analysis for ${symbol}. Focus on recent developments.` 
            }
          ],
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        try {
          const parsed = JSON.parse(content);
          return {
            symbol,
            headlines: parsed.headlines || [],
            marketTrend: parsed.marketTrend || 'neutral',
            keyEvents: parsed.keyEvents || [],
            impact: parsed.impact || 'neutral',
            newsCount: parsed.headlines?.length || 0,
            timestamp: new Date().toISOString()
          };
        } catch {
          // Parse failed
        }
      }
    }
    
    // Fallback response
    return {
      symbol,
      headlines: ['Market analysis in progress'],
      marketTrend: 'neutral',
      keyEvents: [],
      impact: 'neutral',
      newsCount: 0,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('News monitor error:', error);
    return {
      symbol: node.data.config?.symbol || 'BTC',
      headlines: [],
      marketTrend: 'neutral',
      keyEvents: [],
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Fundamental Analysis Node - Use AI for crypto fundamentals
async function executeFundamentalAnalysis(
  node: WorkflowNode,
  context: ExecutionContext,
  supabase: any
) {
  console.log('Executing Fundamental Analysis node:', node.data.label);
  
  try {
    const symbol = node.data.config?.symbol || 'BTC';
    
    // Get market data from context
    const marketData = Array.from(context.nodeOutputs.values())
      .find(output => output?.price) || {};
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (LOVABLE_API_KEY) {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { 
              role: 'system', 
              content: 'You are a crypto fundamental analyst. Provide fundamental analysis. Return JSON with: overallScore (1-100), marketCap (estimate), useCase (brief), adoption (low/medium/high), risks (array of 2), strengths (array of 2), recommendation (buy/sell/hold).' 
            },
            { 
              role: 'user', 
              content: `Provide fundamental analysis for ${symbol}. Current price: $${marketData.price || 'unknown'}.` 
            }
          ],
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        
        try {
          const parsed = JSON.parse(content);
          return {
            symbol,
            overallScore: parsed.overallScore || 50,
            marketCap: parsed.marketCap || 'Unknown',
            useCase: parsed.useCase || 'N/A',
            adoption: parsed.adoption || 'medium',
            risks: parsed.risks || [],
            strengths: parsed.strengths || [],
            recommendation: parsed.recommendation || 'hold',
            timestamp: new Date().toISOString()
          };
        } catch {
          // Parse failed
        }
      }
    }
    
    // Fallback
    return {
      symbol,
      overallScore: 50,
      marketCap: 'Unknown',
      useCase: 'Cryptocurrency',
      adoption: 'medium',
      risks: ['Market volatility'],
      strengths: ['Established network'],
      recommendation: 'hold',
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error('Fundamental analysis error:', error);
    return {
      symbol: node.data.config?.symbol || 'BTC',
      overallScore: 0,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

async function executeAIRiskAssessment(
  node: WorkflowNode,
  context: ExecutionContext,
  supabase: any
) {
  // Get market data from previous nodes
  const marketData = Array.from(context.nodeOutputs.values())
    .find(output => output?.marketData)?.marketData || {};

  const prompt = `Analyze the following market data and provide a risk assessment:
${JSON.stringify(marketData, null, 2)}

Provide:
1. Risk level (low/medium/high)
2. Key risks identified
3. Recommended action (buy/sell/hold)
4. Confidence score (0-100)

Respond in JSON format.`;

  try {
    const { data, error } = await supabase.functions.invoke('lovable-ai-chat', {
      body: { 
        messages: [
          { role: 'system', content: 'You are a financial risk analyst. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ]
      }
    });

    if (error) throw error;

    // Parse AI response
    let assessment;
    try {
      assessment = typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      // If AI doesn't return JSON, create structured response
      assessment = {
        riskLevel: 'medium',
        risks: ['Unable to parse AI response'],
        recommendation: 'hold',
        confidence: 50,
        rawResponse: data,
      };
    }

    return { assessment };
  } catch (error: any) {
    console.error('AI analysis error:', error);
    return {
      assessment: {
        riskLevel: 'high',
        risks: ['AI analysis failed'],
        recommendation: 'hold',
        confidence: 0,
        error: error.message,
      }
    };
  }
}

// Helper function to select optimal exchange based on fees, liquidity, and trading pairs
async function selectOptimalExchange(connections: any[], symbol: string, quantity: number, side: string): Promise<any> {
  if (connections.length === 1) {
    return connections[0];
  }
  
  console.log(`Analyzing ${connections.length} exchanges for optimal trade execution`);
  
  const ccxtLib = await import('https://esm.sh/ccxt@4.2.25');
  const exchangeScores: Array<{ connection: any; score: number; details: any }> = [];
  
  for (const connection of connections) {
    try {
      const ExchangeClass = (ccxtLib as any)[connection.exchange_name.toLowerCase()];
      if (!ExchangeClass) continue;
      
      const exchange = new ExchangeClass({
        apiKey: connection.api_key_encrypted,
        secret: connection.api_secret_encrypted,
        enableRateLimit: true,
      });
      
      // Fetch market info
      const ticker = await exchange.fetchTicker(symbol);
      const orderbook = await exchange.fetchOrderBook(symbol);
      
      // Calculate metrics
      const fees = exchange.fees?.trading?.taker || 0.001;
      const spread = ((ticker.ask - ticker.bid) / ticker.last) * 100;
      const liquidity = orderbook.bids.slice(0, 10).reduce((sum: number, bid: any) => sum + bid[1], 0);
      
      // Score calculation (lower is better)
      // 40% fees, 30% spread, 30% liquidity (inverted)
      const feeScore = fees * 1000 * 0.4;
      const spreadScore = spread * 0.3;
      const liquidityScore = (1 / Math.max(liquidity, 1)) * 1000 * 0.3;
      const totalScore = feeScore + spreadScore + liquidityScore;
      
      exchangeScores.push({
        connection,
        score: totalScore,
        details: {
          fees,
          spread: spread.toFixed(2) + '%',
          liquidity: liquidity.toFixed(2),
          estimatedCost: quantity * ticker.last * fees
        }
      });
      
      console.log(`Exchange ${connection.exchange_name}: score=${totalScore.toFixed(2)}, fees=${fees}, spread=${spread.toFixed(2)}%, liquidity=${liquidity.toFixed(2)}`);
    } catch (error) {
      console.error(`Failed to analyze ${connection.exchange_name}:`, error);
    }
  }
  
  if (exchangeScores.length === 0) {
    return connections[0]; // Fallback to first connection
  }
  
  // Select exchange with lowest score (best optimization)
  exchangeScores.sort((a, b) => a.score - b.score);
  const optimal = exchangeScores[0];
  
  console.log(`Selected ${optimal.connection.exchange_name} as optimal exchange:`, optimal.details);
  return optimal.connection;
}

async function executeTradeNode(
  node: WorkflowNode,
  context: ExecutionContext,
  supabase: any
) {
  console.log('Executing Trade node:', node.data.label);
  
  try {
    // Get trade parameters from node config
    const symbol = node.data.config?.symbol || context.nodeOutputs.get('market-data')?.symbol || 'BTC/USDT';
    const side = node.data.config?.side || 'buy'; // 'buy' or 'sell'
    const orderType = node.data.config?.orderType || 'market'; // 'market' or 'limit'
    let quantity = node.data.config?.quantity || 0.001;
    const isPaperTrading = node.data.config?.isPaperTrading !== false; // Default to paper trading
    
    let price = node.data.config?.price || context.nodeOutputs.get('market-data')?.price || 0;
    let exchangeOrderId = null;
    let exchangeOptimization = null;
    
    // PRE-TRADE SAFETY VALIDATION
    if (!isPaperTrading) {
      console.log('Performing pre-trade safety checks...');
      
      // Check 1: Get user's portfolio to validate position size
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', context.userId);
      
      const totalPortfolioValue = portfolios?.reduce((sum: number, p: any) => 
        sum + (p.current_value || 0), 0) || 0;
      
      const tradeValue = quantity * price;
      const tradePercent = totalPortfolioValue > 0 
        ? (tradeValue / totalPortfolioValue) * 100 
        : 0;
      
      if (tradePercent > SAFETY_RULES.maxSingleTradePercent) {
        throw new Error(
          `Trade size ${tradePercent.toFixed(2)}% exceeds maximum allowed ${SAFETY_RULES.maxSingleTradePercent}% per trade`
        );
      }
      
      // Check 2: Daily trade count limit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayTrades, error: tradeCountError } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', context.userId)
        .eq('agent_id', context.agentId)
        .gte('executed_at', today.toISOString());
      
      if (todayTrades && todayTrades.length >= SAFETY_RULES.maxDailyTrades) {
        throw new Error(
          `Daily trade limit reached (${SAFETY_RULES.maxDailyTrades} trades). Try again tomorrow.`
        );
      }
      
      // Check 3: Require paper trading first
      if (SAFETY_RULES.requirePaperTradingFirst) {
        const { data: paperTrades } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', context.userId)
          .eq('agent_id', context.agentId)
          .eq('is_paper_trade', true);
        
        if (!paperTrades || paperTrades.length < SAFETY_RULES.minPaperTradesRequired) {
          throw new Error(
            `Agent requires at least ${SAFETY_RULES.minPaperTradesRequired} successful paper trades before live trading. Current: ${paperTrades?.length || 0}`
          );
        }
      }
      
      // Check 4: Health check on exchange connection
      const { data: connections } = await supabase
        .from('exchange_connections')
        .select('*')
        .eq('user_id', context.userId)
        .eq('is_active', true);
      
      if (!connections || connections.length === 0) {
        throw new Error('No active exchange connection found');
      }
      
      // Verify connection health and permissions
      const healthyConnections = connections.filter((c: any) => 
        c.health_status === 'healthy' && c.permissions?.trade === true
      );
      
      if (healthyConnections.length === 0) {
        throw new Error('No healthy exchange connections with trading permissions found');
      }
      
      console.log('✓ All safety checks passed');
    }
    
    // If live trading, execute via CCXT with exchange-specific optimization
    if (!isPaperTrading) {
      // Get user's exchange connection
      const { data: connections } = await supabase
        .from('exchange_connections')
        .select('*')
        .eq('user_id', context.userId)
        .eq('is_active', true)
        .eq('health_status', 'healthy');
      
      if (!connections || connections.length === 0) {
        throw new Error('No active exchange connection found');
      }
      
      // Exchange-specific optimization: Select best exchange for this trade
      const connection = await selectOptimalExchange(connections, symbol, quantity, side);
      
      // Import CCXT
      const ccxtLib = await import('https://esm.sh/ccxt@4.2.25');
      const ExchangeClass = (ccxtLib as any)[connection.exchange_name.toLowerCase()];
      
      if (!ExchangeClass) {
        throw new Error(`Exchange ${connection.exchange_name} not supported`);
      }
      
      // Initialize exchange with credentials
      const exchange = new ExchangeClass({
        apiKey: connection.api_key_encrypted, // TODO: Decrypt using Supabase Vault
        secret: connection.api_secret_encrypted,
        enableRateLimit: true,
      });
      
      // Fetch exchange-specific data for optimization
      const ticker = await exchange.fetchTicker(symbol);
      const orderbook = await exchange.fetchOrderBook(symbol);
      
      // Calculate exchange-specific optimization
      exchangeOptimization = {
        exchange: connection.exchange_name,
        fees: exchange.fees?.trading || { maker: 0.001, taker: 0.001 },
        spread: ticker.ask - ticker.bid,
        liquidity: orderbook.bids.slice(0, 10).reduce((sum: number, bid: any) => sum + bid[1], 0),
        estimatedFee: quantity * price * (exchange.fees?.trading?.taker || 0.001)
      };
      
      // Adjust quantity based on fees to ensure profitability
      const adjustedQuantity = quantity * (1 - exchangeOptimization.fees.taker);
      console.log('Exchange optimization:', exchangeOptimization);
      console.log(`Adjusted quantity from ${quantity} to ${adjustedQuantity} to account for fees`);
      
      // Check balance before trading
      const balance = await exchange.fetchBalance();
      const [base, quote] = symbol.split('/');
      
      if (side === 'buy') {
        const requiredBalance = adjustedQuantity * price;
        if (!balance[quote] || balance[quote].free < requiredBalance) {
          throw new Error(`Insufficient ${quote} balance`);
        }
      } else {
        if (!balance[base] || balance[base].free < adjustedQuantity) {
          throw new Error(`Insufficient ${base} balance`);
        }
      }
      
      // Place order with optimized parameters
      const order = await exchange.createOrder(symbol, orderType, side, adjustedQuantity, orderType === 'limit' ? price : undefined);
      exchangeOrderId = order.id;
      price = order.price || price;
      quantity = adjustedQuantity;
      
      console.log('Live trade executed with optimization:', order);
    }

    // Record transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: context.userId,
        agent_id: context.agentId,
        execution_id: context.executionId,
        asset_symbol: symbol,
        transaction_type: side,
        order_type: orderType,
        quantity,
        price,
        total_value: quantity * price,
        is_paper_trade: isPaperTrading,
      });

    if (txError) {
      console.error('Failed to record transaction:', txError);
    }
    
    // Update portfolio
    const { data: existingPortfolio } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', context.userId)
      .eq('asset_symbol', symbol.split('/')[0])
      .single();
    
    if (existingPortfolio) {
      const newQuantity = side === 'buy' 
        ? existingPortfolio.quantity + quantity 
        : existingPortfolio.quantity - quantity;
      
      const newAvgPrice = side === 'buy'
        ? ((existingPortfolio.average_buy_price * existingPortfolio.quantity) + (price * quantity)) / newQuantity
        : existingPortfolio.average_buy_price;
      
      await supabase
        .from('portfolios')
        .update({
          quantity: newQuantity,
          average_buy_price: newAvgPrice,
          current_value: newQuantity * price,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existingPortfolio.id);
    } else if (side === 'buy') {
      await supabase
        .from('portfolios')
        .insert({
          user_id: context.userId,
          asset_symbol: symbol.split('/')[0],
          quantity,
          average_buy_price: price,
          current_value: quantity * price,
        });
    }

    const tradeData = {
      symbol,
      type: orderType,
      side,
      quantity,
      price,
      totalValue: quantity * price,
      isPaperTrading,
      exchangeOrderId,
      exchangeOptimization,
    };

    return { success: true, trade: tradeData };
  } catch (error: any) {
    console.error('Trade execution error:', error);
    throw error;
  }
}

async function executeSendAlert(
  node: WorkflowNode,
  context: ExecutionContext,
  supabase: any
) {
  const config = node.data.config;
  const message = config.message || 'Alert from workflow';
  
  // Get previous outputs for context
  const outputs = Array.from(context.nodeOutputs.values());
  const contextData = JSON.stringify(outputs);

  const { data: alert, error } = await supabase
    .from('alerts')
    .insert([{
      user_id: context.userId,
      agent_id: context.agentId,
      title: config.title || 'Workflow Alert',
      message: `${message}\n\nContext: ${contextData}`,
      severity: config.severity || 'info',
    }])
    .select()
    .single();

  if (error) throw error;

  return { alert, sent: true };
}

async function executeCondition(node: WorkflowNode, context: ExecutionContext) {
  const config = node.data.config;
  const condition = config.condition || 'true';
  
  // Simple condition evaluation
  // In production, use a safer evaluation method
  let result = false;
  try {
    // Get previous outputs
    const outputs = Object.fromEntries(context.nodeOutputs);
    
    // Simple evaluation - check if condition string evaluates to true
    if (condition.includes('riskLevel')) {
      const assessment = outputs[Object.keys(outputs).find(k => outputs[k]?.assessment) || '']?.assessment;
      result = assessment?.riskLevel === 'low';
    } else {
      result = condition === 'true';
    }
  } catch (error) {
    console.error('Condition evaluation error:', error);
    result = false;
  }

  return { conditionMet: result };
}

async function logNodeExecution(
  executionId: string,
  node: WorkflowNode,
  status: string,
  result: any,
  supabase: any
) {
  try {
    // Get current logs
    const { data: execution } = await supabase
      .from('executions')
      .select('logs')
      .eq('id', executionId)
      .single();

    const currentLogs = execution?.logs || [];
    const newLog = {
      nodeId: node.id,
      nodeType: node.type,
      status,
      result: typeof result === 'string' ? result : JSON.stringify(result),
      timestamp: new Date().toISOString(),
    };

    // Append new log
    const { error } = await supabase
      .from('executions')
      .update({
        logs: [...currentLogs, newLog]
      })
      .eq('id', executionId);

    if (error) console.error('Failed to log node execution:', error);
  } catch (error) {
    console.error('Error logging node execution:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, workflowData, testMode = false } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId = 'test-user';
    let isPaperTrading = true;
    let executionId = crypto.randomUUID();

    // In test mode, skip auth and agent lookup
    if (!testMode) {
      // Get auth token
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new Error('No authorization header');

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) throw new Error('Unauthorized');

      userId = user.id;

      // Get agent details
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (agentError || !agent) throw new Error('Agent not found');
      isPaperTrading = agent.is_paper_trading;

      // Create execution record
      const { data: execution, error: execError } = await supabase
        .from('executions')
        .insert([{
          user_id: user.id,
          agent_id: agentId,
          status: 'running',
        }])
        .select()
        .single();

      if (execError) throw execError;
      executionId = execution.id;
    }

    console.log('🚀 Starting workflow execution', { agentId, testMode, nodeCount: workflowData?.nodes?.length });

    // Initialize execution context
    const context: ExecutionContext = {
      nodeOutputs: new Map(),
      workflowState: {},
      userId,
      agentId: agentId || 'test-agent',
      executionId,
      isPaperTrading,
    };

    // Build execution plan
    const nodes = workflowData?.nodes || [];
    const edges = workflowData?.edges || [];
    const executionOrder = buildExecutionPlan(nodes, edges);

    console.log('📋 Execution order:', executionOrder);

    // Execute nodes in order
    const executionLog: string[] = [];
    for (const nodeId of executionOrder) {
      const node = nodes.find((n: WorkflowNode) => n.id === nodeId);
      if (!node) continue;

      console.log(`📦 Executing node: ${node.type} (${node.id})`);
      executionLog.push(`Executing: ${node.data?.label || node.type}`);

      try {
        await executeNode(node, context, supabase);
        executionLog.push(`✅ Completed: ${node.data?.label || node.type}`);
      } catch (nodeError: any) {
        console.error(`❌ Node ${node.id} failed:`, nodeError.message);
        executionLog.push(`❌ Failed: ${node.data?.label || node.type} - ${nodeError.message}`);
        // Continue with other nodes instead of stopping
      }
    }

    // Update execution status if not in test mode
    if (!testMode && executionId) {
      await supabase
        .from('executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId);
    }

    // Convert Map to object for JSON serialization
    const outputsObj: Record<string, any> = {};
    context.nodeOutputs.forEach((value, key) => {
      outputsObj[key] = value;
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        executionId,
        outputs: outputsObj,
        executionLog,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Execution error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
