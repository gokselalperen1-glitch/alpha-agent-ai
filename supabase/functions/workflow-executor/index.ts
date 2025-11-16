import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        result = await executeMarketData(node, context);
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

async function executeMarketData(node: WorkflowNode, context: ExecutionContext) {
  // Mock market data - in production, connect to real exchange APIs
  const symbols = node.data.config.symbols || ['BTC/USD'];
  const data: Record<string, any> = {};
  
  for (const symbol of symbols) {
    data[symbol] = {
      price: Math.random() * 50000 + 20000, // Mock price
      volume: Math.random() * 1000000,
      timestamp: new Date().toISOString(),
      change24h: (Math.random() - 0.5) * 10,
    };
  }
  
  return { marketData: data };
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

async function executeTradeNode(
  node: WorkflowNode,
  context: ExecutionContext,
  supabase: any
) {
  const config = node.data.config;
  const symbol = config.symbol || 'BTC/USD';
  const orderType = config.orderType || 'market';
  const quantity = config.quantity || 0.01;

  // Get market data
  const marketData = Array.from(context.nodeOutputs.values())
    .find(output => output?.marketData)?.marketData || {};
  
  const price = marketData[symbol]?.price || 0;
  const totalValue = price * quantity;

  // Record transaction
  const { data: transaction, error } = await supabase
    .from('transactions')
    .insert([{
      user_id: context.userId,
      agent_id: context.agentId,
      execution_id: context.executionId,
      asset_symbol: symbol,
      transaction_type: config.action || 'buy',
      order_type: orderType,
      quantity: quantity,
      price: price,
      total_value: totalValue,
      is_paper_trade: context.isPaperTrading,
      fees: totalValue * 0.001, // 0.1% fee
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    trade: transaction,
    executed: true,
    isPaperTrade: context.isPaperTrading,
  };
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
    const { agentId, workflowData } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) throw new Error('Agent not found');

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

    // Initialize execution context
    const context: ExecutionContext = {
      nodeOutputs: new Map(),
      workflowState: {},
      userId: user.id,
      agentId,
      executionId: execution.id,
      isPaperTrading: agent.is_paper_trading,
    };

    // Build execution plan
    const nodes = workflowData.nodes || [];
    const edges = workflowData.edges || [];
    const executionOrder = buildExecutionPlan(nodes, edges);

    console.log('Execution order:', executionOrder);

    // Execute nodes in order
    for (const nodeId of executionOrder) {
      const node = nodes.find((n: WorkflowNode) => n.id === nodeId);
      if (!node) continue;

      await executeNode(node, context, supabase);
    }

    // Update execution status
    await supabase
      .from('executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', execution.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        executionId: execution.id,
        outputs: Object.fromEntries(context.nodeOutputs),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Execution error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
