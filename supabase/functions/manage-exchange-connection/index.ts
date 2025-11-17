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

    const { action, exchangeName, apiKey, apiSecret, connectionId } = await req.json();

    if (action === 'test') {
      // Test exchange connection
      const exchangeId = exchangeName.toLowerCase();
      const ExchangeClass = (ccxtLib as any)[exchangeId];
      
      if (!ExchangeClass) {
        throw new Error(`Exchange ${exchangeName} not supported`);
      }
      
      const exchange = new ExchangeClass({
        apiKey,
        secret: apiSecret,
        enableRateLimit: true,
      });

      // Test by fetching balance
      const balance = await exchange.fetchBalance();
      const markets = await exchange.loadMarkets();

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Connection successful',
          data: {
            availableMarkets: Object.keys(markets).slice(0, 10), // Return first 10 markets
            balancePreview: Object.keys(balance.total || {}).slice(0, 5), // Return first 5 assets
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'save') {
      // Save exchange connection
      const { data: connection, error } = await supabase
        .from('exchange_connections')
        .insert({
          user_id: user.id,
          exchange_name: exchangeName,
          api_key_encrypted: apiKey, // TODO: Implement proper encryption with Supabase Vault
          api_secret_encrypted: apiSecret,
          is_active: true,
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
