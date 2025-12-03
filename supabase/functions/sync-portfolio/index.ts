import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import * as ccxtLib from "https://esm.sh/ccxt@4.2.25";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { connectionId } = await req.json();

    console.log(`Syncing portfolio for user ${user.id}, connection: ${connectionId || 'all'}`);

    // Get exchange connections
    let query = supabase
      .from('exchange_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (connectionId) {
      query = query.eq('id', connectionId);
    }

    const { data: connections, error: connError } = await query;

    if (connError) throw connError;

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active connections', portfolios: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allBalances: any[] = [];
    const errors: any[] = [];

    for (const connection of connections) {
      try {
        const exchangeId = connection.exchange_name.toLowerCase();
        const ExchangeClass = (ccxtLib as any)[exchangeId];

        if (!ExchangeClass) {
          console.error(`Exchange ${connection.exchange_name} not supported`);
          errors.push({ exchange: connection.exchange_name, error: 'Not supported' });
          continue;
        }

        const exchangeConfig: any = {
          apiKey: connection.api_key_encrypted,
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

        // Fetch balance from exchange
        const balance = await exchange.fetchBalance();
        
        // Get current prices for assets
        const tickers = await exchange.fetchTickers();

        // Process balances
        for (const [asset, amounts] of Object.entries(balance.total || {})) {
          const amount = amounts as number;
          if (amount > 0 && asset !== 'USD' && asset !== 'USDT' && asset !== 'USDC') {
            // Find ticker for this asset
            const usdtPair = `${asset}/USDT`;
            const usdPair = `${asset}/USD`;
            
            let currentPrice = 0;
            if (tickers[usdtPair]) {
              currentPrice = tickers[usdtPair].last || 0;
            } else if (tickers[usdPair]) {
              currentPrice = tickers[usdPair].last || 0;
            }

            const currentValue = amount * currentPrice;

            allBalances.push({
              user_id: user.id,
              exchange_connection_id: connection.id,
              asset_symbol: asset,
              quantity: amount,
              current_value: currentValue,
              last_updated: new Date().toISOString(),
            });
          }
        }

        // Also add stablecoins
        for (const stablecoin of ['USD', 'USDT', 'USDC']) {
          const amount = (balance.total as any)?.[stablecoin] || 0;
          if (amount > 0) {
            allBalances.push({
              user_id: user.id,
              exchange_connection_id: connection.id,
              asset_symbol: stablecoin,
              quantity: amount,
              current_value: amount, // 1:1 for stablecoins
              last_updated: new Date().toISOString(),
            });
          }
        }

        console.log(`✓ Synced ${connection.exchange_name}: ${allBalances.length} assets`);

      } catch (error: any) {
        console.error(`✗ Error syncing ${connection.exchange_name}:`, error.message);
        errors.push({ exchange: connection.exchange_name, error: error.message });
      }
    }

    // Upsert portfolio data
    if (allBalances.length > 0) {
      // Delete existing portfolios for this user and these connections
      const connectionIds = connections.map(c => c.id);
      await supabase
        .from('portfolios')
        .delete()
        .eq('user_id', user.id)
        .in('exchange_connection_id', connectionIds);

      // Insert new portfolio data
      const { error: insertError } = await supabase
        .from('portfolios')
        .insert(allBalances);

      if (insertError) {
        console.error('Error inserting portfolios:', insertError);
        throw insertError;
      }
    }

    // Calculate total value
    const totalValue = allBalances.reduce((sum, b) => sum + (b.current_value || 0), 0);

    return new Response(
      JSON.stringify({
        success: true,
        portfolios: allBalances,
        totalValue,
        syncedExchanges: connections.length - errors.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Portfolio sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
