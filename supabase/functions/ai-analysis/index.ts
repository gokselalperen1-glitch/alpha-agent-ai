import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIAnalysisRequest {
  capability: 'market-analysis' | 'risk-scoring' | 'sentiment-detection' | 'strategy-optimization';
  symbols: string[];
  model?: string;
  additionalContext?: string;
  outputFormat?: 'structured' | 'summary' | 'signals';
  marketData?: any;
}

import { requireAuth } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  try {
    const { capability, symbols, model, additionalContext, outputFormat, marketData }: AIAnalysisRequest = await req.json();
    
    
    console.log(`AI Analysis: ${capability} for ${symbols.join(', ')}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build the system prompt based on capability
    const systemPrompts: Record<string, string> = {
      'market-analysis': `You are an expert financial analyst. Analyze market conditions for the given assets and provide:
- Current market phase (bullish/bearish/consolidation)
- Key price levels (support/resistance)
- Trend strength (1-10)
- Volatility assessment
- Short-term outlook (1-7 days)
Provide actionable insights. Be concise and data-driven.`,
      
      'risk-scoring': `You are a risk assessment specialist. Evaluate the risk profile for the given assets considering:
- Market volatility
- Liquidity conditions
- Correlation risks
- Sentiment indicators
- Macroeconomic factors
Provide a risk score from 1-100 and detailed breakdown.`,
      
      'sentiment-detection': `You are a sentiment analysis expert. Analyze market sentiment for the given assets:
- Overall sentiment (bullish/neutral/bearish)
- Sentiment score (-100 to +100)
- Key sentiment drivers
- Social media trends
- News impact assessment`,
      
      'strategy-optimization': `You are a trading strategy optimizer. Given the current market conditions, suggest:
- Optimal position sizing
- Entry/exit points
- Stop-loss levels
- Take-profit targets
- Risk/reward ratios
Focus on practical, executable recommendations.`,
    };

    const systemPrompt = systemPrompts[capability] || systemPrompts['market-analysis'];

    // Build user prompt with context
    let userPrompt = `Analyze the following assets: ${symbols.join(', ')}`;
    
    if (marketData) {
      userPrompt += `\n\nCurrent Market Data:\n${JSON.stringify(marketData, null, 2)}`;
    }
    
    if (additionalContext) {
      userPrompt += `\n\nAdditional Context: ${additionalContext}`;
    }

    userPrompt += `\n\nProvide your analysis in ${outputFormat === 'structured' ? 'JSON format' : outputFormat === 'signals' ? 'trading signal format with clear BUY/SELL/HOLD recommendations' : 'a concise summary'}.`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model === 'gemini-pro' ? 'google/gemini-2.5-pro' : 
               model === 'gpt-5' ? 'openai/gpt-5' :
               model === 'gpt-5-mini' ? 'openai/gpt-5-mini' :
               'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add more credits.');
      }
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const analysisContent = aiData.choices?.[0]?.message?.content;

    // Try to parse as JSON if structured format was requested
    let parsedAnalysis = analysisContent;
    if (outputFormat === 'structured') {
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = analysisContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          parsedAnalysis = JSON.parse(jsonMatch[1].trim());
        } else {
          parsedAnalysis = JSON.parse(analysisContent);
        }
      } catch {
        // Keep as string if parsing fails
        parsedAnalysis = { raw: analysisContent };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        capability,
        symbols,
        analysis: parsedAnalysis,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('AI Analysis Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

