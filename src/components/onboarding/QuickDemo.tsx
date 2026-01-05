import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Sparkles, 
  Bot,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DemoPerformance } from './DemoPerformance';

interface QuickDemoProps {
  onStartFull?: () => void;
}

const DEMO_AGENTS = [
  {
    id: 'conservative',
    name: 'Safe Growth',
    description: 'Low-risk, steady returns',
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    riskLevel: 'conservative' as const,
    features: ['Capital preservation', 'BTC/ETH focus', 'Low volatility'],
  },
  {
    id: 'moderate',
    name: 'Balanced AI',
    description: 'Medium risk, good returns',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    riskLevel: 'moderate' as const,
    features: ['Diversified', 'Risk-adjusted', 'Trending coins'],
  },
  {
    id: 'aggressive',
    name: 'Max Returns',
    description: 'High risk, high reward',
    icon: Zap,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    riskLevel: 'aggressive' as const,
    features: ['Altcoin focus', 'Momentum trading', 'High volatility'],
  },
];

export const QuickDemo = ({ onStartFull }: QuickDemoProps) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleTryNow = (agentId: string) => {
    setSelectedAgent(agentId);
    setIsRunning(true);
  };

  const selectedAgentData = DEMO_AGENTS.find(a => a.id === selectedAgent);

  if (isRunning && selectedAgentData) {
    return (
      <div className="space-y-6">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", selectedAgentData.bgColor)}>
                  <selectedAgentData.icon className={cn("h-5 w-5", selectedAgentData.color)} />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {selectedAgentData.name}
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-0 gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Running
                    </Badge>
                  </CardTitle>
                  <CardDescription>{selectedAgentData.description}</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsRunning(false)}>
                Stop Demo
              </Button>
            </div>
          </CardHeader>
        </Card>

        <DemoPerformance 
          agentName={selectedAgentData.name} 
          riskLevel={selectedAgentData.riskLevel} 
        />

        {/* CTA to start for real */}
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-primary mb-3" />
            <h3 className="font-semibold mb-1">Like what you see?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your portfolio to start trading with real data
            </p>
            <Button onClick={onStartFull} className="gap-2">
              Get Started for Real
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="w-full border-border/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Try AI Trading - No Setup Required</CardTitle>
        </div>
        <CardDescription>
          See how our AI agents perform with simulated trades. No portfolio connection needed.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {DEMO_AGENTS.map((agent) => {
            const Icon = agent.icon;
            
            return (
              <div
                key={agent.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border transition-all",
                  "bg-card hover:bg-muted/30"
                )}
              >
                <div className={cn("p-2.5 rounded-lg shrink-0", agent.bgColor)}>
                  <Icon className={cn("h-5 w-5", agent.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{agent.name}</div>
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {agent.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs font-normal">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="shrink-0 gap-1"
                  onClick={() => handleTryNow(agent.id)}
                >
                  <Play className="h-3 w-3" />
                  Try Now
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            No signup needed
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Instant results
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Safe simulation
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
