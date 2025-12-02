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

    console.log('Starting exchange health check...');

    // Get all active exchange connections
    const { data: connections, error: fetchError } = await supabase
      .from('exchange_connections')
      .select('*')
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching connections:', fetchError);
      throw fetchError;
    }

    console.log(`Checking ${connections?.length || 0} exchange connections`);

    const results = [];

    for (const connection of connections || []) {
      try {
        const exchangeId = connection.exchange_name.toLowerCase();
        const ExchangeClass = (ccxtLib as any)[exchangeId];
        
        if (!ExchangeClass) {
          console.error(`Exchange ${connection.exchange_name} not supported`);
          await supabase
            .from('exchange_connections')
            .update({
              health_status: 'unsupported',
              last_health_check: new Date().toISOString(),
            })
            .eq('id', connection.id);
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

        // Perform health check - fetch balance
        const balance = await exchange.fetchBalance();
        
        // Check API permissions
        const permissions = {
          read: true,
          trade: false,
          withdraw: false,
        };

        try {
          // Try to check if trading is enabled
          await exchange.fetchOpenOrders();
          permissions.trade = true;
        } catch (e) {
          // Trading permission check failed
          console.log(`Trading permission check failed for ${connection.exchange_name}`);
        }

        // Update connection with healthy status
        await supabase
          .from('exchange_connections')
          .update({
            health_status: 'healthy',
            last_health_check: new Date().toISOString(),
            permissions: permissions,
          })
          .eq('id', connection.id);

        results.push({
          connectionId: connection.id,
          exchange: connection.exchange_name,
          status: 'healthy',
          permissions,
        });

        console.log(`✓ ${connection.exchange_name} (${connection.id}) - healthy`);

      } catch (error: any) {
        console.error(`✗ ${connection.exchange_name} (${connection.id}) - error:`, error.message);

        // Determine error type
        let healthStatus = 'error';
        if (error.message.includes('Invalid API') || error.message.includes('authentication')) {
          healthStatus = 'auth_failed';
        } else if (error.message.includes('rate limit')) {
          healthStatus = 'rate_limited';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          healthStatus = 'network_error';
        }

        // Update connection with error status
        await supabase
          .from('exchange_connections')
          .update({
            health_status: healthStatus,
            last_health_check: new Date().toISOString(),
          })
          .eq('id', connection.id);

        // Create alert for unhealthy connection
        await supabase
          .from('alerts')
          .insert({
            user_id: connection.user_id,
            title: 'Exchange Connection Issue',
            message: `${connection.exchange_name} connection health check failed: ${error.message}`,
            severity: 'error',
          });

        results.push({
          connectionId: connection.id,
          exchange: connection.exchange_name,
          status: healthStatus,
          error: error.message,
        });
      }
    }

    console.log('Health check complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        checked: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
