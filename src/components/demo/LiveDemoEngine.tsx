import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AgentDecisionFlow, DecisionStep } from './AgentDecisionFlow';
import { DemoPortfolio, DemoTrade, DemoPosition } from './DemoPortfolio';
import { Play, Pause, RotateCcw, Zap } from 'lucide-react';

interface Strategy {
  id: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
}

const STRATEGIES: Strategy[] = [
  { id: 'safe-growth', name: 'Safe Growth', description: 'RSI-based, buys oversold', riskLevel: 'low' },
  { id: 'trend-follower', name: 'Trend Follower', description: 'SMA-based trend following', riskLevel: 'medium' },
  { id: 'momentum', name: 'Momentum', description: 'Aggressive momentum trading', riskLevel: 'high' },
];

const STARTING_BALANCE = 10000;

interface LiveDemoEngineProps {
  onClose?: () => void;
}

export const LiveDemoEngine = ({ onClose }: LiveDemoEngineProps) => {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(STRATEGIES[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<DecisionStep[]>([]);
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [positions, setPositions] = useState<DemoPosition[]>([]);
  const [trades, setTrades] = useState<DemoTrade[]>([]);
  const [lastSignal, setLastSignal] = useState<{ signal: string; reasoning: string } | null>(null);
  const [tickCount, setTickCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetDemo = useCallback(() => {
    setBalance(STARTING_BALANCE);
    setPositions([]);
    setTrades([]);
    setSteps([]);
    setLastSignal(null);
    setTickCount(0);
  }, []);

  const runTick = useCallback(async () => {
    const startTime = Date.now();
    
    // Initialize steps
    setSteps([
      { id: 'fetch', name: 'Fetching Market Data', status: 'loading' },
      { id: 'analyze', name: 'Analyzing Indicators', status: 'pending' },
      { id: 'signal', name: 'Generating Signal', status: 'pending' },
      { id: 'risk', name: 'Risk Assessment', status: 'pending' },
      { id: 'execute', name: 'Execute Decision', status: 'pending' },
    ]);

    try {
      // Step 1: Fetch data
      const fetchStart = Date.now();
      const { data, error } = await supabase.functions.invoke('demo-agent-tick', {
        body: { strategy: selectedStrategy.id, symbol: 'BTC' }
      });

      if (error) throw error;

      setSteps(prev => prev.map(s => 
        s.id === 'fetch' ? { ...s, status: 'success', value: `BTC: $${data.price?.toLocaleString()} (${data.change24h > 0 ? '+' : ''}${data.change24h?.toFixed(2)}%)`, duration: Date.now() - fetchStart } : s
      ));

      // Step 2: Analyze
      await new Promise(r => setTimeout(r, 300));
      setSteps(prev => prev.map(s => 
        s.id === 'analyze' ? { ...s, status: 'loading' } : s
      ));
      await new Promise(r => setTimeout(r, 400));
      setSteps(prev => prev.map(s => 
        s.id === 'analyze' ? { ...s, status: 'success', value: `RSI: ${data.rsi?.toFixed(1)} | SMA20: $${data.sma20?.toLocaleString()}`, duration: 400 } : s
      ));

      // Step 3: Signal
      await new Promise(r => setTimeout(r, 200));
      setSteps(prev => prev.map(s => 
        s.id === 'signal' ? { ...s, status: 'loading' } : s
      ));
      await new Promise(r => setTimeout(r, 300));
      const signalColor = data.signal === 'buy' ? 'text-green-500' : data.signal === 'sell' ? 'text-red-500' : 'text-yellow-500';
      setSteps(prev => prev.map(s => 
        s.id === 'signal' ? { ...s, status: 'success', value: `${data.signal?.toUpperCase()} (${(data.confidence * 100).toFixed(0)}% confidence)`, duration: 300 } : s
      ));
      setLastSignal({ signal: data.signal, reasoning: data.reasoning });

      // Step 4: Risk check
      await new Promise(r => setTimeout(r, 200));
      setSteps(prev => prev.map(s => 
        s.id === 'risk' ? { ...s, status: 'loading' } : s
      ));
      await new Promise(r => setTimeout(r, 250));
      
      const currentPosition = positions.find(p => p.symbol === 'BTC');
      const positionValue = currentPosition ? currentPosition.quantity * data.price : 0;
      const riskOk = positionValue < balance * 0.5; // Max 50% in one position
      
      setSteps(prev => prev.map(s => 
        s.id === 'risk' ? { ...s, status: 'success', value: riskOk ? 'Risk within limits ✓' : 'Position size limit reached', duration: 250 } : s
      ));

      // Step 5: Execute
      await new Promise(r => setTimeout(r, 200));
      setSteps(prev => prev.map(s => 
        s.id === 'execute' ? { ...s, status: 'loading' } : s
      ));
      await new Promise(r => setTimeout(r, 300));

      // Execute trade logic
      if (data.signal === 'buy' && data.confidence > 0.6 && riskOk && !currentPosition) {
        // Buy: use 10% of balance
        const tradeAmount = balance * 0.1;
        const quantity = tradeAmount / data.price;
        
        setBalance(prev => prev - tradeAmount);
        setPositions([{
          symbol: 'BTC',
          quantity,
          avgPrice: data.price,
          currentPrice: data.price,
          unrealizedPnl: 0
        }]);
        setTrades(prev => [...prev, {
          id: `trade-${Date.now()}`,
          symbol: 'BTC',
          side: 'buy',
          price: data.price,
          quantity,
          timestamp: new Date()
        }]);
        
        setSteps(prev => prev.map(s => 
          s.id === 'execute' ? { ...s, status: 'success', value: `Bought ${quantity.toFixed(6)} BTC @ $${data.price.toLocaleString()}`, duration: 300 } : s
        ));
      } else if (data.signal === 'sell' && data.confidence > 0.6 && currentPosition) {
        // Sell position
        const saleValue = currentPosition.quantity * data.price;
        const pnl = saleValue - (currentPosition.quantity * currentPosition.avgPrice);
        
        setBalance(prev => prev + saleValue);
        setPositions([]);
        setTrades(prev => [...prev, {
          id: `trade-${Date.now()}`,
          symbol: 'BTC',
          side: 'sell',
          price: data.price,
          quantity: currentPosition.quantity,
          timestamp: new Date(),
          pnl
        }]);
        
        setSteps(prev => prev.map(s => 
          s.id === 'execute' ? { ...s, status: 'success', value: `Sold @ $${data.price.toLocaleString()} (${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)})`, duration: 300 } : s
        ));
      } else {
        setSteps(prev => prev.map(s => 
          s.id === 'execute' ? { ...s, status: 'success', value: data.signal === 'hold' ? 'No action - holding' : 'Conditions not met', duration: 300 } : s
        ));
      }

      // Update position prices
      if (positions.length > 0) {
        setPositions(prev => prev.map(p => ({
          ...p,
          currentPrice: data.price,
          unrealizedPnl: (data.price - p.avgPrice) * p.quantity
        })));
      }

      setTickCount(prev => prev + 1);
      
    } catch (err: any) {
      console.error('Demo tick error:', err);
      setSteps(prev => prev.map(s => 
        s.status === 'loading' ? { ...s, status: 'error', value: err.message } : s
      ));
    }
  }, [selectedStrategy, positions, balance]);

  // Auto-run every 30 seconds when running
  useEffect(() => {
    if (isRunning) {
      runTick();
      intervalRef.current = setInterval(runTick, 30000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, runTick]);

  // Calculate current total value
  const positionValue = positions.reduce((sum, p) => sum + (p.quantity * p.currentPrice), 0);
  const totalValue = balance + positionValue;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Live Demo Trading</CardTitle>
          </div>
          <Badge variant={isRunning ? 'default' : 'secondary'}>
            {isRunning ? 'LIVE' : 'PAUSED'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Strategy Selection */}
        <div className="flex gap-2">
          {STRATEGIES.map(strategy => (
            <Button
              key={strategy.id}
              size="sm"
              variant={selectedStrategy.id === strategy.id ? 'default' : 'outline'}
              onClick={() => {
                setSelectedStrategy(strategy);
                if (!isRunning) resetDemo();
              }}
              disabled={isRunning}
              className="flex-1"
            >
              {strategy.name}
            </Button>
          ))}
        </div>
        
        {/* Strategy Description */}
        <p className="text-xs text-muted-foreground">
          {selectedStrategy.description} • Risk: {selectedStrategy.riskLevel}
        </p>
        
        {/* Controls */}
        <div className="flex gap-2">
          <Button
            onClick={() => setIsRunning(!isRunning)}
            variant={isRunning ? 'destructive' : 'default'}
            className="flex-1"
          >
            {isRunning ? <><Pause className="h-4 w-4 mr-2" /> Stop</> : <><Play className="h-4 w-4 mr-2" /> Start Demo</>}
          </Button>
          <Button variant="outline" size="icon" onClick={resetDemo} disabled={isRunning}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Decision Flow */}
        {steps.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              Decision Flow (Tick #{tickCount})
            </h4>
            <AgentDecisionFlow steps={steps} />
          </div>
        )}
        
        {/* Signal Reasoning */}
        {lastSignal && (
          <div className="bg-muted/30 rounded-lg p-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-1">AI Reasoning</h4>
            <p className="text-sm">{lastSignal.reasoning}</p>
          </div>
        )}
        
        {/* Portfolio */}
        <DemoPortfolio
          startingBalance={STARTING_BALANCE}
          currentBalance={totalValue}
          positions={positions}
          trades={trades}
        />
        
        {/* Footer */}
        <p className="text-[10px] text-muted-foreground text-center">
          Demo uses real BTC prices • Updates every 30s • No real money involved
        </p>
      </CardContent>
    </Card>
  );
};
