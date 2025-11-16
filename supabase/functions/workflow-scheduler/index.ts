import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Get all active agents
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*, workflows(*)')
      .eq('status', 'active');

    if (error) throw error;

    console.log(`Found ${agents?.length || 0} active agents`);

    const results = [];

    // Execute each agent's workflow
    for (const agent of agents || []) {
      if (!agent.workflows || agent.workflows.length === 0) continue;

      const workflow = agent.workflows[0];
      
      try {
        // Call workflow executor
        const { data, error: execError } = await supabase.functions.invoke('workflow-executor', {
          body: {
            agentId: agent.id,
            workflowData: {
              nodes: workflow.nodes,
              edges: workflow.edges,
            }
          }
        });

        if (execError) throw execError;

        results.push({
          agentId: agent.id,
          agentName: agent.name,
          success: true,
          executionId: data?.executionId,
        });
      } catch (error: any) {
        console.error(`Error executing agent ${agent.id}:`, error);
        results.push({
          agentId: agent.id,
          agentName: agent.name,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        executedAgents: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Scheduler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
