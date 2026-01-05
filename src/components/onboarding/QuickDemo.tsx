import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Bot,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { LiveDemoEngine } from '@/components/demo/LiveDemoEngine';

interface QuickDemoProps {
  onStartFull?: () => void;
}

export const QuickDemo = ({ onStartFull }: QuickDemoProps) => {
  const [showDemo, setShowDemo] = useState(false);

  if (showDemo) {
    return (
      <div className="space-y-4">
        <LiveDemoEngine />
        
        {/* CTA to start for real */}
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-primary mb-3" />
            <h3 className="font-semibold mb-1">Like what you see?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your portfolio to start trading with real data
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setShowDemo(false)}>
                Back to Overview
              </Button>
              <Button onClick={onStartFull} className="gap-2">
                Get Started for Real
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
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
          Watch our AI agents analyze real market data and make trading decisions in real-time.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6 text-center">
          <div className="bg-primary/10 rounded-full p-4 inline-block mb-4">
            <Play className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Live Demo Trading</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            See real BTC prices, real RSI calculations, and real trading signals. 
            Start with $10,000 simulated funds.
          </p>
          <Button onClick={() => setShowDemo(true)} size="lg" className="gap-2">
            <Play className="h-4 w-4" />
            Start Live Demo
          </Button>
        </div>

        <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Real market prices
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            Real trading logic
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
