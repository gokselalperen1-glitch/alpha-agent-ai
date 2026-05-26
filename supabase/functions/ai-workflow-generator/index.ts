import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAuth } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  try {
    const { description, userGoals } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating workflow for description:", description);

    const systemPrompt = `You are an expert trading strategy designer. Convert natural language trading strategy descriptions into structured workflow configurations.

Output a JSON workflow with nodes and edges following this structure:

AVAILABLE NODE TYPES:
- schedule-trigger: Triggers workflow on schedule (config: { interval: "1h" | "4h" | "1d" })
- market-data: Fetches market prices (config: { symbol: string, provider: "binance" })
- technical-indicators: Calculates indicators (config: { symbol, indicator: "RSI" | "MACD" | "SMA" | "EMA", time_period, interval })
- sentiment-analysis: Analyzes market sentiment (config: { symbol, source: "stocktwits" | "twitter" })
- news-monitor: Monitors news (config: { keywords: string[], category })
- fundamental-analysis: Analyzes fundamentals (config: { symbol, metrics: ["earnings", "revenue"] })
- ai-risk-assessment: AI risk analysis (config: { risk_threshold: 0-100 })
- if-condition: Conditional branching (config: { condition: string })
- execute-trade: Executes trade (config: { action: "buy" | "sell", amount, asset })
- send-alert: Sends notification (config: { message, severity })

WORKFLOW STRUCTURE:
{
  "nodes": [
    {
      "id": "node-1",
      "type": "schedule-trigger",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Every Hour",
        "type": "schedule-trigger",
        "config": { "interval": "1h" }
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]
}

BEST PRACTICES:
- Always start with schedule-trigger
- Add market-data early for price information
- Use technical-indicators for entry/exit signals
- Include ai-risk-assessment before execute-trade
- Add if-condition for decision points
- End with execute-trade and send-alert
- Position nodes left-to-right, spaced 250px horizontally, 100px vertically
- Use clear, descriptive labels

Return ONLY the JSON workflow, no markdown or explanation.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a trading workflow for this strategy:\n\n${description}\n\nUser goals: ${userGoals || "maximize profit with moderate risk"}` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const workflowJson = data.choices[0].message.content;
    
    console.log("Generated workflow JSON:", workflowJson);

    // Parse and validate the workflow
    let workflow;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = workflowJson.match(/```json\n([\s\S]*?)\n```/) || workflowJson.match(/```\n([\s\S]*?)\n```/);
      const cleanJson = jsonMatch ? jsonMatch[1] : workflowJson;
      workflow = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Failed to parse workflow JSON:", parseError);
      throw new Error("Failed to parse AI-generated workflow");
    }

    // Validate workflow structure
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      throw new Error("Invalid workflow: missing nodes array");
    }
    if (!workflow.edges || !Array.isArray(workflow.edges)) {
      throw new Error("Invalid workflow: missing edges array");
    }

    return new Response(JSON.stringify({ 
      success: true,
      workflow 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Workflow generation error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to generate workflow"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
