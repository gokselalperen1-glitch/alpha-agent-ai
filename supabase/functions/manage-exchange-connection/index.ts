import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import * as ccxtLib from "https://esm.sh/ccxt@4.2.25";
import { SUPPORTED_EXCHANGES } from "../_shared/exchange-config.ts";

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

    const { action, exchangeName, apiKey, apiSecret, passphrase, isTestnet, connectionId } = await req.json();

    if (action === 'test') {
      // Validate exchange is supported
      const exchangeId = exchangeName.toLowerCase();
      const exchangeConfig = SUPPORTED_EXCHANGES[exchangeId];
      
      if (!exchangeConfig) {
        throw new Error(`Exchange ${exchangeName} not supported`);
      }

      // Validate required fields
      if (exchangeConfig.requirements.passphrase && !passphrase) {
        throw new Error(`${exchangeName} requires a passphrase`);
      }

      const ExchangeClass = (ccxtLib as any)[exchangeConfig.ccxtId];
      
      if (!ExchangeClass) {
        throw new Error(`Exchange ${exchangeName} not supported by CCXT`);
      }
      
      const exchangeInstanceConfig: any = {
        apiKey,
        secret: apiSecret,
        enableRateLimit: true,
      };

      if (passphrase) {
        exchangeInstanceConfig.password = passphrase;
      }

      if (isTestnet && exchangeConfig.features.testnet) {
        exchangeInstanceConfig.sandbox = true;
      }

      const exchange = new ExchangeClass(exchangeInstanceConfig);

      // Test by fetching balance
      const balance = await exchange.fetchBalance();
      const markets = await exchange.loadMarkets();

      // Check permissions
      const permissions = {
        read: true,
        trade: false,
        withdraw: false,
      };

      try {
        await exchange.fetchOpenOrders();
        permissions.trade = true;
      } catch (e) {
        console.log('Trading permission not detected');
      }

      // Get supported pairs from exchange config
      const supportedPairs: string[] = [];
      if (exchangeConfig.supportedAssets && exchangeConfig.baseCurrencies) {
        const assets = exchangeConfig.supportedAssets;
        const bases = exchangeConfig.baseCurrencies;
        for (const asset of assets) {
          for (const base of bases) {
            const pair = `${asset}/${base}`;
            if (markets[pair]) {
              supportedPairs.push(pair);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Connection successful',
          data: {
            availableMarkets: Object.keys(markets).slice(0, 10),
            balancePreview: Object.keys(balance.total || {}).slice(0, 5),
            permissions,
            supportedPairs: supportedPairs.slice(0, 20),
            features: exchangeConfig.features,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'save') {
      // Validate exchange is supported
      const exchangeId = exchangeName.toLowerCase();
      const exchangeConfig = SUPPORTED_EXCHANGES[exchangeId];
      
      if (!exchangeConfig) {
        throw new Error(`Exchange ${exchangeName} not supported`);
      }

      // Save exchange connection with enhanced fields
      const { data: connection, error } = await supabase
        .from('exchange_connections')
        .insert({
          user_id: user.id,
          exchange_name: exchangeName,
          api_key_encrypted: apiKey,
          api_secret_encrypted: apiSecret,
          passphrase_encrypted: passphrase || null,
          is_testnet: isTestnet || false,
          is_active: true,
          health_status: 'healthy',
          last_health_check: new Date().toISOString(),
          rate_limit_config: exchangeConfig.rateLimit,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, connection }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('exchange_connections')
        .delete()
        .eq('id', connectionId)
        .eq('user_id', user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'list') {
      const { data: connections, error } = await supabase
        .from('exchange_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, connections }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Invalid action');
  } catch (error: any) {
    console.error('Exchange connection error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
