import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get all active connections for user
    const { data: connections, error: connError } = await supabase
      .from("investment_broker_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (connError) {
      throw connError;
    }

    const results = [];

    // Sync each broker connection
    for (const conn of connections || []) {
      try {
        const syncResult = await syncBrokerConnection(conn, user.id, supabase);
        results.push(syncResult);
      } catch (error) {
        console.error(`Failed to sync ${conn.broker_type}:`, error);
        results.push({
          broker_type: conn.broker_type,
          status: "failed",
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          synced_count: connections?.length || 0,
          results,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

async function syncBrokerConnection(connection: any, userId: string, supabase: any) {
  // Record sync start
  const { data: syncRecord, error: syncError } = await supabase
    .from("portfolio_sync_history")
    .insert({
      user_id: userId,
      connection_id: connection.id,
      sync_type: "full",
      status: "in_progress",
    })
    .select()
    .single();

  if (syncError) {
    throw new Error(`Failed to create sync record: ${syncError.message}`);
  }

  try {
    // For now, we'll create sample data to demonstrate
    // In production, these would call actual broker APIs

    const holdings = generateSampleHoldings(connection.id, userId);

    // Upsert holdings
    for (const holding of holdings) {
      await supabase
        .from("investment_holdings")
        .upsert(holding, {
          onConflict: "user_id,connection_id,symbol",
        });
    }

    // Update sync record as completed
    await supabase
      .from("portfolio_sync_history")
      .update({
        status: "completed",
        holdings_count: holdings.length,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncRecord.id);

    // Update connection last_sync_at
    await supabase
      .from("investment_broker_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        health_status: "healthy",
      })
      .eq("id", connection.id);

    return {
      broker_type: connection.broker_type,
      status: "completed",
      holdings_synced: holdings.length,
    };
  } catch (error: any) {
    // Update sync record as failed
    await supabase
      .from("portfolio_sync_history")
      .update({
        status: "failed",
        error_message: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncRecord.id);

    throw error;
  }
}

function generateSampleHoldings(connectionId: string, userId: string) {
  const sampleHoldings = [
    { symbol: "AAPL", quantity: 10, avgCost: 150, price: 175 },
    { symbol: "GOOGL", quantity: 5, avgCost: 2500, price: 2800 },
    { symbol: "MSFT", quantity: 8, avgCost: 300, price: 340 },
    { symbol: "TSLA", quantity: 3, avgCost: 600, price: 850 },
  ];

  return sampleHoldings.map((holding) => {
    const marketValue = holding.quantity * holding.price;
    const costBasis = holding.quantity * holding.avgCost;
    const gainLoss = marketValue - costBasis;
    const gainLossPercent = (gainLoss / costBasis) * 100;

    return {
      user_id: userId,
      connection_id: connectionId,
      symbol: holding.symbol,
      quantity: holding.quantity,
      average_cost: holding.avgCost,
      current_price: holding.price,
      market_value: marketValue,
      gain_loss: gainLoss,
      gain_loss_percent: gainLossPercent,
      asset_type: "stock",
      currency: "USD",
      last_price_update: new Date().toISOString(),
    };
  });
}
