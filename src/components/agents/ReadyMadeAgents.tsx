import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Brain, 
  Zap, 
  Shield, 
  TrendingUp, 
  Loader2,
  CheckCircle,
  Rocket
} from 'lucide-react';

interface ReadyMadeAgentsProps {
  hasPortfolioConnected: boolean;
  onConnectPortfolio: () => void;
}

const READY_MADE_AGENTS = [
  {
    id: 'aladdin-conservative',
    name: 'Aladdin Conservative',
    description: 'Risk-aware trading using BlackRock Aladdin AI for portfolio protection',
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    features: ['Risk Scoring', 'Portfolio Protection', 'Low Volatility'],
    riskLevel: 'Low',
    aiProvider: 'aladdin',
    capability: 'risk-scoring',
  },
  {
    id: 'aladdin-growth',
    name: 'Aladdin Growth',
    description: 'AI-powered growth strategy with Aladdin market predictions',
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    features: ['Market Predictions', 'Growth Focus', 'Dynamic Allocation'],
    riskLevel: 'Medium',
    aiProvider: 'aladdin',
    capability: 'market-predictions',
  },
  {
    id: 'aladdin-signals',
    name: 'Aladdin Trade Signals',
    description: 'Real-time trade signals powered by Aladdin institutional AI',
    icon: Zap,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    features: ['Trade Signals', 'Real-time Alerts', 'Auto Execute'],
    riskLevel: 'Medium-High',
    aiProvider: 'aladdin',
    capability: 'trade-signals',
  },
  {
    id: 'ai-analyst',
    name: 'AI Market Analyst',
    description: 'Comprehensive market analysis using Lovable AI',
    icon: Brain,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    features: ['Market Analysis', 'Sentiment Detection', 'News Monitoring'],
    riskLevel: 'Configurable',
    aiProvider: 'lovable',
    capability: 'market-analysis',
  },
];

export const ReadyMadeAgents = ({ hasPortfolioConnected, onConnectPortfolio }: ReadyMadeAgentsProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deployingAgent, setDeployingAgent] = useState<string | null>(null);

  const handleDeployAgent = async (agent: typeof READY_MADE_AGENTS[0]) => {
    if (!hasPortfolioConnected) {
      onConnectPortfolio();
      return;
    }

    setDeployingAgent(agent.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to deploy agents',
          variant: 'destructive',
        });
        return;
      }

      // Create the agent with pre-configured workflow
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

      // Create pre-configured workflow nodes based on agent type
      const workflowNodes = generateWorkflowNodes(agent);
      const workflowEdges = generateWorkflowEdges(workflowNodes);

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
        description: `${agent.name} is ready. Configure and activate in the builder.`,
      });

      // Navigate to the agent builder
      navigate(`/agent-builder/${agentData.id}`);
    } catch (error: any) {
      console.error('Deploy error:', error);
      toast({
        title: 'Deployment Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeployingAgent(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Ready-Made Agents
          </h2>
          <p className="text-muted-foreground mt-1">
            Deploy pre-configured AI trading agents instantly
          </p>
        </div>
        {!hasPortfolioConnected && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            Connect portfolio to deploy
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {READY_MADE_AGENTS.map((agent) => {
          const Icon = agent.icon;
          const isDeploying = deployingAgent === agent.id;

          return (
            <Card 
              key={agent.id}
              className="relative overflow-hidden hover:border-primary/50 transition-colors"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${agent.bgColor} blur-3xl opacity-50`} />
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${agent.bgColor}`}>
                    <Icon className={`h-5 w-5 ${agent.color}`} />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Risk: {agent.riskLevel}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-3">{agent.name}</CardTitle>
                <CardDescription>{agent.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {agent.features.map((feature) => (
                    <Badge key={feature} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>

                <Button
                  className="w-full"
                  onClick={() => handleDeployAgent(agent)}
                  disabled={isDeploying}
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deploying...
                    </>
                  ) : hasPortfolioConnected ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Deploy Agent
                    </>
                  ) : (
                    'Connect Portfolio First'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

function generateWorkflowNodes(agent: typeof READY_MADE_AGENTS[0]) {
  const baseNodes = [
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
        config: {
          dataToFetch: 'all',
          updateFrequency: 'realtime',
        },
      },
    },
    {
      id: 'market-1',
      type: 'market-data',
      position: { x: 100, y: 320 },
      data: {
        type: 'market-data',
        label: 'Market Data',
        config: {
          symbol: 'BTC/USDT',
          exchange: 'binance',
        },
      },
    },
    {
      id: 'indicators-1',
      type: 'technical-indicators',
      position: { x: 400, y: 320 },
      data: {
        type: 'technical-indicators',
        label: 'Technical Analysis',
        config: {
          symbol: 'BTC/USDT',
          indicator: 'RSI',
          interval: '1h',
          time_period: 14,
        },
      },
    },
  ];

  // Add Investment AI node based on agent type
  const aiNode = {
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
        customInstructions: getCustomInstructions(agent),
        outputFormat: 'structured',
      },
    },
  };

  // Add condition and trade nodes
  const actionNodes = [
    {
      id: 'condition-1',
      type: 'if-condition',
      position: { x: 250, y: 620 },
      data: {
        type: 'if-condition',
        label: 'Trading Condition',
        config: {
          conditions: getConditions(agent),
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
        config: {
          action: 'buy',
          symbol: 'BTC/USDT',
          amount: 0.001,
          orderType: 'market',
        },
      },
    },
    {
      id: 'alert-1',
      type: 'send-alert',
      position: { x: 250, y: 920 },
      data: {
        type: 'send-alert',
        label: 'Send Alert',
        config: {
          alertType: 'trade_executed',
          message: `${agent.name} executed a trade`,
          severity: 'info',
        },
      },
    },
  ];

  return [...baseNodes, aiNode, ...actionNodes];
}

function generateWorkflowEdges(nodes: any[]) {
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

function getCustomInstructions(agent: typeof READY_MADE_AGENTS[0]): string {
  switch (agent.id) {
    case 'aladdin-conservative':
      return 'Focus on capital preservation. Only recommend trades with very low risk scores (<30). Prioritize stable assets and avoid high volatility.';
    case 'aladdin-growth':
      return 'Focus on growth opportunities with moderate risk tolerance. Look for assets with strong momentum and positive market predictions.';
    case 'aladdin-signals':
      return 'Generate actionable trade signals based on real-time market data. Provide clear entry/exit points with confidence levels.';
    case 'ai-analyst':
      return 'Provide comprehensive market analysis including technical indicators, sentiment, and news impact. Summarize key opportunities and risks.';
    default:
      return '';
  }
}

function getConditions(agent: typeof READY_MADE_AGENTS[0]) {
  switch (agent.id) {
    case 'aladdin-conservative':
      return [
        { field: 'riskScore', operator: '<', value: '30' },
        { field: 'confidence', operator: '>', value: '80' },
      ];
    case 'aladdin-growth':
      return [
        { field: 'riskScore', operator: '<', value: '50' },
        { field: 'recommendation', operator: '==', value: 'buy' },
      ];
    case 'aladdin-signals':
      return [
        { field: 'signalStrength', operator: '>', value: '0.7' },
        { field: 'confidence', operator: '>', value: '70' },
      ];
    case 'ai-analyst':
      return [
        { field: 'sentiment', operator: '>', value: '0.5' },
        { field: 'riskScore', operator: '<', value: '60' },
      ];
    default:
      return [];
  }
}
