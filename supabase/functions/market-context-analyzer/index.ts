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
    const { symbol, marketData, indicators, sentiment } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing market context for:", symbol);

    const systemPrompt = `You are an expert market analyst specializing in crypto and stock trading. Analyze market conditions and provide actionable insights.

Your analysis should consider:
- Current price trends and volatility
- Technical indicator signals
- Market sentiment
- Risk factors and opportunities

Provide a structured JSON response with:
{
  "marketPhase": "bull" | "bear" | "sideways" | "volatile",
  "volatilityLevel": "low" | "medium" | "high",
  "trendStrength": 0-100,
  "riskScore": 0-100,
  "confidence": 0-100,
  "signals": {
    "buyPressure": 0-100,
    "sellPressure": 0-100,
    "momentum": "bullish" | "bearish" | "neutral"
  },
  "recommendations": {
    "action": "buy" | "sell" | "hold" | "wait",
    "positionSize": "small" | "medium" | "large",
    "stopLoss": number | null,
    "takeProfit": number | null
  },
  "reasoning": "Brief explanation of the analysis"
}

Return ONLY the JSON, no markdown.`;

    const userPrompt = `Analyze market conditions for ${symbol}:

Market Data:
${JSON.stringify(marketData, null, 2)}

Technical Indicators:
${JSON.stringify(indicators, null, 2)}

Sentiment Analysis:
${JSON.stringify(sentiment, null, 2)}

Provide a comprehensive market analysis with trading recommendations.`;

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
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
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
    const analysisJson = data.choices[0].message.content;
    
    console.log("Market analysis:", analysisJson);

    // Parse the analysis
    let analysis;
    try {
      const jsonMatch = analysisJson.match(/```json\n([\s\S]*?)\n```/) || analysisJson.match(/```\n([\s\S]*?)\n```/);
      const cleanJson = jsonMatch ? jsonMatch[1] : analysisJson;
      analysis = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Failed to parse analysis JSON:", parseError);
      throw new Error("Failed to parse AI analysis");
    }

    return new Response(JSON.stringify({ 
      success: true,
      analysis 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Market analysis error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to analyze market context"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
