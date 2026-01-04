import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  TrendingUp, 
  Zap, 
  Brain,
  Rocket,
  Loader2,
  Sparkles,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InvestmentProfile } from './InvestmentProfileWizard';

interface AgentRecommendationProps {
  profile: InvestmentProfile;
  onComplete: () => void;
  onSkip?: () => void;
}

const AGENT_RECOMMENDATIONS = {
  conservative: {
    primary: {
      id: 'aladdin-conservative',
      name: 'Aladdin Conservative',
      description: 'Risk-aware trading focusing on capital preservation',
      icon: Shield,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      features: ['Risk Scoring', 'Portfolio Protection', 'Low Volatility'],
      aiProvider: 'aladdin',
      capability: 'risk-scoring',
    },
    alternative: {
      id: 'ai-analyst',
      name: 'AI Market Analyst',
      description: 'Comprehensive analysis with Lovable AI (free)',
      icon: Brain,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      features: ['Market Analysis', 'Sentiment', 'News Monitoring'],
      aiProvider: 'lovable',
      capability: 'market-analysis',
    },
  },
  moderate: {
    primary: {
      id: 'ai-analyst',
      name: 'AI Market Analyst',
      description: 'Balanced analysis using Lovable AI',
      icon: Brain,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      features: ['Market Analysis', 'Sentiment Detection', 'News Monitoring'],
      aiProvider: 'lovable',
      capability: 'market-analysis',
    },
    alternative: {
      id: 'aladdin-growth',
      name: 'Aladdin Growth',
      description: 'AI-powered growth strategy',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      features: ['Market Predictions', 'Growth Focus', 'Dynamic Allocation'],
      aiProvider: 'aladdin',
      capability: 'market-predictions',
    },
  },
  aggressive: {
    primary: {
      id: 'aladdin-signals',
      name: 'Aladdin Trade Signals',
      description: 'Real-time trade signals for active trading',
      icon: Zap,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      features: ['Trade Signals', 'Real-time Alerts', 'Auto Execute'],
      aiProvider: 'aladdin',
      capability: 'trade-signals',
    },
    alternative: {
      id: 'aladdin-growth',
      name: 'Aladdin Growth',
      description: 'High-growth strategy with predictions',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      features: ['Market Predictions', 'Growth Focus', 'Dynamic Allocation'],
      aiProvider: 'aladdin',
      capability: 'market-predictions',
    },
  },
};

export const AgentRecommendation = ({ profile, onComplete, onSkip }: AgentRecommendationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDeploying, setIsDeploying] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<'primary' | 'alternative'>('primary');

  const recommendations = AGENT_RECOMMENDATIONS[profile.riskTolerance];
  const agent = recommendations[selectedAgent];

  const handleDeploy = async () => {
    setIsDeploying(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the agent
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .insert({
          name: agent.name,
          description: agent.description,
          user_id: user.id,
          status: 'draft',
          is_paper_trading: true,
        })
        .select()
        .single();

      if (agentError) throw agentError;

      // Create pre-configured workflow
      const workflowNodes = generateWorkflowNodes(agent, profile);
      const workflowEdges = generateWorkflowEdges();

      const { error: workflowError } = await supabase
        .from('workflows')
        .insert({
          agent_id: agentData.id,
          nodes: workflowNodes,
          edges: workflowEdges,
        });

      if (workflowError) throw workflowError;

      toast({
        title: 'Agent Deployed!',
        description: `${agent.name} is ready to go. Starting in paper trading mode.`,
      });

      onComplete();
      navigate(`/agent-builder/${agentData.id}`);
    } catch (error: any) {
      console.error('Deploy error:', error);
      toast({
        title: 'Deployment Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const Icon = agent.icon;

  return (
    <Card className="w-full max-w-2xl mx-auto border-border/50 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs gap-1">
            <Sparkles className="h-3 w-3" />
            AI Recommended
          </Badge>
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
              Skip for now
            </Button>
          )}
        </div>
        <CardTitle className="text-xl">Your Perfect AI Agent</CardTitle>
        <CardDescription>
          Based on your {profile.riskTolerance} investment style, we recommend:
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Primary Recommendation */}
        <div
          onClick={() => setSelectedAgent('primary')}
          className={cn(
            "p-5 rounded-xl border-2 cursor-pointer transition-all",
            selectedAgent === 'primary'
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          )}
        >
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-lg", recommendations.primary.bgColor)}>
              {(() => {
                const PrimaryIcon = recommendations.primary.icon;
                return <PrimaryIcon className={cn("h-6 w-6", recommendations.primary.color)} />;
              })()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{recommendations.primary.name}</h3>
                <Badge className="text-[10px]">Best Match</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {recommendations.primary.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {recommendations.primary.features.map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs font-normal">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
            {selectedAgent === 'primary' && (
              <Check className="h-5 w-5 text-primary shrink-0" />
            )}
          </div>
        </div>

        {/* Alternative Option */}
        <div
          onClick={() => setSelectedAgent('alternative')}
          className={cn(
            "p-4 rounded-lg border-2 cursor-pointer transition-all",
            selectedAgent === 'alternative'
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", recommendations.alternative.bgColor)}>
              {(() => {
                const AltIcon = recommendations.alternative.icon;
                return <AltIcon className={cn("h-5 w-5", recommendations.alternative.color)} />;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{recommendations.alternative.name}</div>
              <p className="text-xs text-muted-foreground truncate">
                {recommendations.alternative.description}
              </p>
            </div>
            {selectedAgent === 'alternative' && (
              <Check className="h-5 w-5 text-primary shrink-0" />
            )}
          </div>
        </div>

        {/* Safety Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <span>
            Your agent will start in <strong>paper trading mode</strong> for safety. 
            Complete 10 successful paper trades to unlock live trading.
          </span>
        </div>

        {/* Deploy Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleDeploy}
          disabled={isDeploying}
        >
          {isDeploying ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Deploying Agent...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4 mr-2" />
              Deploy {agent.name}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

function generateWorkflowNodes(agent: any, profile: InvestmentProfile) {
  const riskThreshold = profile.riskTolerance === 'conservative' ? 30 
    : profile.riskTolerance === 'moderate' ? 50 : 70;

  return [
    {
      id: 'trigger-1',
      type: 'schedule-trigger',
      position: { x: 250, y: 50 },
      data: {
        type: 'schedule-trigger',
        label: 'Schedule Trigger',
        config: {
          cronExpression: '0 * * * *',
          timezone: 'UTC',
          description: 'Runs every hour',
        },
      },
    },
    {
      id: 'portfolio-1',
      type: 'portfolio-connector',
      position: { x: 250, y: 180 },
      data: {
        type: 'portfolio-connector',
        label: 'Portfolio Data',
        config: { dataToFetch: 'all', updateFrequency: 'realtime' },
      },
    },
    {
      id: 'market-1',
      type: 'market-data',
      position: { x: 100, y: 320 },
      data: {
        type: 'market-data',
        label: 'Market Data',
        config: { symbol: 'BTC/USDT', exchange: 'binance' },
      },
    },
    {
      id: 'indicators-1',
      type: 'technical-indicators',
      position: { x: 400, y: 320 },
      data: {
        type: 'technical-indicators',
        label: 'Technical Analysis',
        config: { symbol: 'BTC/USDT', indicator: 'RSI', interval: '1h', time_period: 14 },
      },
    },
    {
      id: 'ai-1',
      type: agent.aiProvider === 'lovable' ? 'ai-connector' : 'investment-ai',
      position: { x: 250, y: 470 },
      data: {
        type: agent.aiProvider === 'lovable' ? 'ai-connector' : 'investment-ai',
        label: agent.aiProvider === 'aladdin' ? 'Aladdin AI' : 'AI Analysis',
        config: {
          provider: agent.aiProvider,
          capability: agent.capability,
          symbols: 'BTC/USDT, ETH/USDT',
          outputFormat: 'structured',
        },
      },
    },
    {
      id: 'condition-1',
      type: 'if-condition',
      position: { x: 250, y: 620 },
      data: {
        type: 'if-condition',
        label: 'Trading Condition',
        config: {
          conditions: [
            { field: 'riskScore', operator: '<', value: String(riskThreshold) },
            { field: 'confidence', operator: '>', value: '70' },
          ],
          logic: 'AND',
        },
      },
    },
    {
      id: 'trade-1',
      type: 'execute-trade',
      position: { x: 250, y: 770 },
      data: {
        type: 'execute-trade',
        label: 'Execute Trade',
        config: { action: 'buy', symbol: 'BTC/USDT', amount: 0.001, orderType: 'market' },
      },
    },
    {
      id: 'alert-1',
      type: 'send-alert',
      position: { x: 250, y: 920 },
      data: {
        type: 'send-alert',
        label: 'Send Alert',
        config: { alertType: 'trade_executed', message: `${agent.name} executed a trade`, severity: 'info' },
      },
    },
  ];
}

function generateWorkflowEdges() {
  return [
    { id: 'e1', source: 'trigger-1', target: 'portfolio-1', animated: true },
    { id: 'e2', source: 'portfolio-1', target: 'market-1', animated: true },
    { id: 'e3', source: 'portfolio-1', target: 'indicators-1', animated: true },
    { id: 'e4', source: 'market-1', target: 'ai-1', animated: true },
    { id: 'e5', source: 'indicators-1', target: 'ai-1', animated: true },
    { id: 'e6', source: 'ai-1', target: 'condition-1', animated: true },
    { id: 'e7', source: 'condition-1', target: 'trade-1', animated: true, label: 'true' },
    { id: 'e8', source: 'trade-1', target: 'alert-1', animated: true },
  ];
}
