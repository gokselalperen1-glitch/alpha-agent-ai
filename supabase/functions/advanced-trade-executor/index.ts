import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeRequest {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop_limit' | 'stop_market' | 'trailing_stop' | 'take_profit' | 'take_profit_limit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  trailingDelta?: number;
  leverage?: number;
  marginType?: 'isolated' | 'cross';
  positionType?: 'spot' | 'margin' | 'perpetual' | 'futures';
  reduceOnly?: boolean;
  postOnly?: boolean;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'GTD';
  stopLoss?: number;
  takeProfit?: number;
  trailingStopPercent?: number;
  exchangeConnectionId?: string;
  agentId?: string;
  isPaperTrading?: boolean;
  ocoOrderId?: string;
}

interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entry_price: number;
  leverage: number;
  margin_type: string;
  position_type: string;
  liquidation_price: number | null;
}

// Safety limits
const SAFETY_RULES = {
  maxLeverage: 20, // Cap at 20x for safety even if exchange allows higher
  maxPositionPercent: 25, // Max 25% of portfolio per position
  maxDailyLoss: 10, // Stop trading if daily loss exceeds 10%
  minMarginRatio: 5, // Alert if margin ratio falls below 5%
  requireConfirmationAbove: 10000, // Require confirmation for trades above $10k
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    const tradeRequest: TradeRequest = await req.json();
    console.log('Trade request received:', JSON.stringify(tradeRequest, null, 2));

    // Validate and apply safety rules
    await validateTradeRequest(supabase, user.id, tradeRequest);

    let result;
    
    if (tradeRequest.isPaperTrading) {
      result = await executePaperTrade(supabase, user.id, tradeRequest);
    } else {
      result = await executeLiveTrade(supabase, user.id, tradeRequest);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Trade execution error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

async function validateTradeRequest(supabase: any, userId: string, request: TradeRequest) {
  // Validate leverage
  if (request.leverage && request.leverage > SAFETY_RULES.maxLeverage) {
    throw new Error(`Leverage ${request.leverage}x exceeds safety limit of ${SAFETY_RULES.maxLeverage}x`);
  }

  // Get current positions and portfolio value
  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId);

  const totalPortfolioValue = portfolios?.reduce((sum: number, p: any) => 
    sum + (p.current_value || 0), 0) || 0;

  // Check position size limit
  if (totalPortfolioValue > 0) {
    // Get current price for the symbol
    const currentPrice = request.price || await fetchCurrentPrice(request.symbol);
    const positionValue = request.quantity * currentPrice * (request.leverage || 1);
    const positionPercent = (positionValue / totalPortfolioValue) * 100;

    if (positionPercent > SAFETY_RULES.maxPositionPercent) {
      throw new Error(
        `Position size ${positionPercent.toFixed(1)}% exceeds limit of ${SAFETY_RULES.maxPositionPercent}%`
      );
    }
  }

  // Check daily loss limit for live trading
  if (!request.isPaperTrading) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: positions } = await supabase
      .from('positions')
      .select('realized_pnl')
      .eq('user_id', userId)
      .gte('updated_at', today.toISOString());

    const dailyPnl = positions?.reduce((sum: number, p: any) => 
      sum + (p.realized_pnl || 0), 0) || 0;

    if (totalPortfolioValue > 0) {
      const dailyLossPercent = Math.abs(Math.min(0, dailyPnl)) / totalPortfolioValue * 100;
      
      if (dailyLossPercent >= SAFETY_RULES.maxDailyLoss) {
        throw new Error(
          `Daily loss limit reached (${dailyLossPercent.toFixed(1)}%). Trading paused for today.`
        );
      }
    }

    // Check for active exchange connection with trade permissions
    const { data: connections } = await supabase
      .from('exchange_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    const validConnections = request.exchangeConnectionId
      ? connections?.filter((c: any) => c.id === request.exchangeConnectionId)
      : connections?.filter((c: any) => c.permissions?.trade === true);

    if (!validConnections || validConnections.length === 0) {
      throw new Error('No active exchange connection with trading permissions');
    }
  }

  console.log('Trade validation passed');
}

async function fetchCurrentPrice(symbol: string): Promise<number> {
  try {
    const ccxtLib = await import('https://esm.sh/ccxt@4.2.25');
    const exchange = new ccxtLib.default.binance();
    const ticker = await exchange.fetchTicker(symbol);
    return ticker.last || 0;
  } catch (e) {
    console.error('Error fetching price:', e);
    return 0;
  }
}

async function executePaperTrade(supabase: any, userId: string, request: TradeRequest) {
  console.log('Executing paper trade...');
  
  const price = request.price || await fetchCurrentPrice(request.symbol);
  const totalValue = request.quantity * price;
  const leverage = request.leverage || 1;
  
  // Calculate simulated fees (0.1% for market, 0.05% for limit)
  const feeRate = request.orderType === 'market' ? 0.001 : 0.0005;
  const fees = totalValue * feeRate;

  // Create or update position
  let positionId: string | null = null;
  
  if (request.positionType && request.positionType !== 'spot') {
    const positionSide = request.side === 'buy' ? 'long' : 'short';
    
    // Check for existing position
    const { data: existingPositions } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .eq('symbol', request.symbol)
      .eq('status', 'open')
      .limit(1);

    const existingPosition = existingPositions?.[0];

    if (existingPosition) {
      // Update existing position
      const newQuantity = existingPosition.side === positionSide
        ? existingPosition.quantity + request.quantity
        : Math.abs(existingPosition.quantity - request.quantity);
      
      const newEntryPrice = existingPosition.side === positionSide
        ? ((existingPosition.entry_price * existingPosition.quantity) + (price * request.quantity)) / (existingPosition.quantity + request.quantity)
        : existingPosition.entry_price;

      // Calculate liquidation price for leveraged positions
      const liquidationPrice = calculateLiquidationPrice(
        newEntryPrice,
        leverage,
        positionSide,
        request.marginType || 'isolated'
      );

      if (newQuantity <= 0) {
        // Close position
        const { error } = await supabase
          .from('positions')
          .update({
            status: 'closed',
            closed_at: new Date().toISOString(),
            realized_pnl: (price - existingPosition.entry_price) * existingPosition.quantity * (positionSide === 'long' ? 1 : -1)
          })
          .eq('id', existingPosition.id);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('positions')
          .update({
            quantity: newQuantity,
            entry_price: newEntryPrice,
            current_price: price,
            liquidation_price: liquidationPrice,
            side: newQuantity > 0 ? positionSide : (positionSide === 'long' ? 'short' : 'long'),
            unrealized_pnl: (price - newEntryPrice) * newQuantity * (positionSide === 'long' ? 1 : -1)
          })
          .eq('id', existingPosition.id);
          
        if (error) throw error;
      }
      
      positionId = existingPosition.id;
    } else {
      // Create new position
      const liquidationPrice = calculateLiquidationPrice(price, leverage, positionSide, request.marginType || 'isolated');
      
      const { data: newPosition, error } = await supabase
        .from('positions')
        .insert({
          user_id: userId,
          exchange_connection_id: request.exchangeConnectionId || null,
          symbol: request.symbol,
          side: positionSide,
          entry_price: price,
          current_price: price,
          quantity: request.quantity,
          leverage,
          margin_type: request.marginType || 'isolated',
          position_type: request.positionType,
          liquidation_price: liquidationPrice,
          stop_loss: request.stopLoss,
          take_profit: request.takeProfit,
          trailing_stop_percent: request.trailingStopPercent,
          status: 'open'
        })
        .select()
        .single();
        
      if (error) throw error;
      positionId = newPosition?.id;
    }
  }

  // Create order record
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      exchange_connection_id: request.exchangeConnectionId || null,
      agent_id: request.agentId || null,
      position_id: positionId,
      symbol: request.symbol,
      side: request.side,
      order_type: request.orderType,
      quantity: request.quantity,
      price: price,
      stop_price: request.stopPrice,
      trailing_delta: request.trailingDelta,
      time_in_force: request.timeInForce || 'GTC',
      reduce_only: request.reduceOnly || false,
      post_only: request.postOnly || false,
      status: 'filled',
      filled_quantity: request.quantity,
      average_fill_price: price,
      fees,
      fee_currency: 'USDT',
      executed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create transaction record for compatibility
  const { error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      agent_id: request.agentId || null,
      exchange_connection_id: request.exchangeConnectionId || null,
      asset_symbol: request.symbol,
      transaction_type: request.side,
      order_type: request.orderType === 'market' ? 'market' : 'limit',
      quantity: request.quantity,
      price,
      total_value: totalValue,
      fees,
      is_paper_trade: true
    });

  if (txError) console.error('Transaction record error:', txError);

  return {
    success: true,
    orderId: order?.id,
    positionId,
    executedPrice: price,
    quantity: request.quantity,
    totalValue,
    fees,
    leverage: leverage,
    isPaperTrade: true
  };
}

async function executeLiveTrade(supabase: any, userId: string, request: TradeRequest) {
  console.log('Executing live trade...');
  
  // Get exchange connection
  const { data: connections, error: connError } = await supabase
    .from('exchange_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('health_status', 'healthy');

  if (connError || !connections?.length) {
    throw new Error('No healthy exchange connection available');
  }

  // Select connection - prefer specified, otherwise pick best for symbol
  const connection = request.exchangeConnectionId
    ? connections.find((c: any) => c.id === request.exchangeConnectionId)
    : await selectOptimalExchange(connections, request.symbol);

  if (!connection) {
    throw new Error('Exchange connection not found or not available');
  }

  // Import and initialize CCXT
  const ccxtLib = await import('https://esm.sh/ccxt@4.2.25');
  const exchangeName = connection.exchange_name as keyof typeof ccxtLib.default;
  const ExchangeClass = (ccxtLib.default as any)[exchangeName];
  
  if (!ExchangeClass) {
    throw new Error(`Exchange ${connection.exchange_name} not supported`);
  }

  const exchangeConfig: any = {
    apiKey: connection.api_key_encrypted, // Should be decrypted in production
    secret: connection.api_secret_encrypted,
    enableRateLimit: true,
  };

  if (connection.passphrase_encrypted) {
    exchangeConfig.password = connection.passphrase_encrypted;
  }

  if (connection.is_testnet) {
    exchangeConfig.sandbox = true;
  }

  const exchange = new ExchangeClass(exchangeConfig);

  // Set leverage for futures/margin if applicable
  if (request.leverage && request.leverage > 1 && request.positionType !== 'spot') {
    try {
      await exchange.setLeverage(request.leverage, request.symbol);
      console.log(`Leverage set to ${request.leverage}x`);
    } catch (e) {
      console.warn('Could not set leverage:', e);
    }

    // Set margin mode
    if (request.marginType) {
      try {
        await exchange.setMarginMode(request.marginType, request.symbol);
        console.log(`Margin mode set to ${request.marginType}`);
      } catch (e) {
        console.warn('Could not set margin mode:', e);
      }
    }
  }

  // Build order parameters
  const orderParams: any = {};
  
  if (request.postOnly) orderParams.postOnly = true;
  if (request.reduceOnly) orderParams.reduceOnly = true;
  if (request.timeInForce) orderParams.timeInForce = request.timeInForce;
  if (request.stopPrice) orderParams.stopPrice = request.stopPrice;
  if (request.trailingDelta) orderParams.trailingDelta = request.trailingDelta;

  // Execute order based on type
  let exchangeOrder;
  const ccxtOrderType = mapOrderType(request.orderType);
  
  try {
    if (request.orderType === 'market') {
      exchangeOrder = await exchange.createOrder(
        request.symbol,
        'market',
        request.side,
        request.quantity,
        undefined,
        orderParams
      );
    } else if (request.orderType === 'limit') {
      exchangeOrder = await exchange.createOrder(
        request.symbol,
        'limit',
        request.side,
        request.quantity,
        request.price,
        orderParams
      );
    } else if (request.orderType === 'stop_limit' || request.orderType === 'stop_market') {
      orderParams.stopLossPrice = request.stopPrice;
      exchangeOrder = await exchange.createOrder(
        request.symbol,
        request.orderType === 'stop_limit' ? 'limit' : 'market',
        request.side,
        request.quantity,
        request.price,
        orderParams
      );
    } else if (request.orderType === 'trailing_stop') {
      orderParams.trailingAmount = request.trailingDelta;
      exchangeOrder = await exchange.createOrder(
        request.symbol,
        'trailing_stop',
        request.side,
        request.quantity,
        undefined,
        orderParams
      );
    }
  } catch (e) {
    console.error('Exchange order error:', e);
    throw new Error(`Exchange order failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  // Determine order status
  const status = mapExchangeStatus(exchangeOrder.status);
  const filledQuantity = exchangeOrder.filled || 0;
  const avgPrice = exchangeOrder.average || exchangeOrder.price || request.price || 0;

  // Create order record
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      exchange_connection_id: connection.id,
      agent_id: request.agentId || null,
      exchange_order_id: exchangeOrder.id,
      symbol: request.symbol,
      side: request.side,
      order_type: request.orderType,
      quantity: request.quantity,
      price: request.price || avgPrice,
      stop_price: request.stopPrice,
      trailing_delta: request.trailingDelta,
      time_in_force: request.timeInForce || 'GTC',
      reduce_only: request.reduceOnly || false,
      post_only: request.postOnly || false,
      status,
      filled_quantity: filledQuantity,
      average_fill_price: avgPrice,
      fees: exchangeOrder.fee?.cost || 0,
      fee_currency: exchangeOrder.fee?.currency || 'USDT',
      executed_at: status === 'filled' ? new Date().toISOString() : null
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create position record if applicable and filled
  let positionId: string | null = null;
  
  if (filledQuantity > 0 && request.positionType && request.positionType !== 'spot') {
    const positionSide = request.side === 'buy' ? 'long' : 'short';
    const liquidationPrice = calculateLiquidationPrice(
      avgPrice,
      request.leverage || 1,
      positionSide,
      request.marginType || 'isolated'
    );

    const { data: position, error: posError } = await supabase
      .from('positions')
      .insert({
        user_id: userId,
        exchange_connection_id: connection.id,
        symbol: request.symbol,
        side: positionSide,
        entry_price: avgPrice,
        current_price: avgPrice,
        quantity: filledQuantity,
        leverage: request.leverage || 1,
        margin_type: request.marginType || 'isolated',
        position_type: request.positionType,
        liquidation_price: liquidationPrice,
        stop_loss: request.stopLoss,
        take_profit: request.takeProfit,
        trailing_stop_percent: request.trailingStopPercent,
        status: 'open'
      })
      .select()
      .single();

    if (!posError && position) {
      positionId = position.id;
      
      // Update order with position reference
      await supabase
        .from('orders')
        .update({ position_id: positionId })
        .eq('id', order?.id);
    }
  }

  // Create transaction record
  if (filledQuantity > 0) {
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        agent_id: request.agentId || null,
        exchange_connection_id: connection.id,
        asset_symbol: request.symbol,
        transaction_type: request.side,
        order_type: request.orderType === 'market' ? 'market' : 'limit',
        quantity: filledQuantity,
        price: avgPrice,
        total_value: filledQuantity * avgPrice,
        fees: exchangeOrder.fee?.cost || 0,
        is_paper_trade: false
      });
  }

  // Set up stop loss / take profit orders if specified
  if (filledQuantity > 0 && (request.stopLoss || request.takeProfit)) {
    await createProtectiveOrders(exchange, supabase, userId, connection.id, request, filledQuantity, avgPrice);
  }

  return {
    success: true,
    orderId: order?.id,
    exchangeOrderId: exchangeOrder.id,
    positionId,
    status,
    executedPrice: avgPrice,
    filledQuantity,
    totalValue: filledQuantity * avgPrice,
    fees: exchangeOrder.fee?.cost || 0,
    leverage: request.leverage || 1,
    isPaperTrade: false
  };
}

async function selectOptimalExchange(connections: any[], symbol: string): Promise<any> {
  // Simple selection: prefer connections that support the symbol
  for (const conn of connections) {
    if (conn.supported_pairs?.includes(symbol)) {
      return conn;
    }
  }
  // Fallback to first healthy connection
  return connections.find(c => c.health_status === 'healthy') || connections[0];
}

function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  side: 'long' | 'short',
  marginType: string
): number {
  // Simplified liquidation price calculation
  // Real calculation would consider maintenance margin, funding rates, etc.
  const maintenanceMarginRate = 0.004; // 0.4% maintenance margin
  const marginFraction = 1 / leverage;
  
  if (side === 'long') {
    return entryPrice * (1 - marginFraction + maintenanceMarginRate);
  } else {
    return entryPrice * (1 + marginFraction - maintenanceMarginRate);
  }
}

function mapOrderType(orderType: string): string {
  const mapping: Record<string, string> = {
    'market': 'market',
    'limit': 'limit',
    'stop_limit': 'stopLimit',
    'stop_market': 'stopMarket',
    'trailing_stop': 'trailingStop',
    'take_profit': 'takeProfit',
    'take_profit_limit': 'takeProfitLimit'
  };
  return mapping[orderType] || 'market';
}

function mapExchangeStatus(status: string): string {
  const mapping: Record<string, string> = {
    'open': 'open',
    'closed': 'filled',
    'canceled': 'cancelled',
    'expired': 'expired',
    'rejected': 'rejected'
  };
  return mapping[status] || status;
}

async function createProtectiveOrders(
  exchange: any,
  supabase: any,
  userId: string,
  connectionId: string,
  request: TradeRequest,
  quantity: number,
  entryPrice: number
) {
  const ocoGroupId = crypto.randomUUID();
  const closeSide = request.side === 'buy' ? 'sell' : 'buy';

  try {
    if (request.stopLoss) {
      console.log(`Creating stop loss at ${request.stopLoss}`);
      
      const slOrder = await exchange.createOrder(
        request.symbol,
        'stopMarket',
        closeSide,
        quantity,
        undefined,
        { stopLossPrice: request.stopLoss, reduceOnly: true }
      );

      await supabase.from('orders').insert({
        user_id: userId,
        exchange_connection_id: connectionId,
        exchange_order_id: slOrder.id,
        symbol: request.symbol,
        side: closeSide,
        order_type: 'stop_market',
        quantity,
        stop_price: request.stopLoss,
        reduce_only: true,
        oco_group_id: ocoGroupId,
        status: 'open'
      });
    }

    if (request.takeProfit) {
      console.log(`Creating take profit at ${request.takeProfit}`);
      
      const tpOrder = await exchange.createOrder(
        request.symbol,
        'takeProfitMarket',
        closeSide,
        quantity,
        undefined,
        { takeProfitPrice: request.takeProfit, reduceOnly: true }
      );

      await supabase.from('orders').insert({
        user_id: userId,
        exchange_connection_id: connectionId,
        exchange_order_id: tpOrder.id,
        symbol: request.symbol,
        side: closeSide,
        order_type: 'take_profit',
        quantity,
        price: request.takeProfit,
        reduce_only: true,
        oco_group_id: ocoGroupId,
        status: 'open'
      });
    }
  } catch (e) {
    console.error('Error creating protective orders:', e);
    // Don't throw - main order was successful
  }
}
