import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { AgentDecisionFlow, DecisionStep } from './AgentDecisionFlow';
import { DemoPortfolio, DemoTrade, DemoPosition } from './DemoPortfolio';
import { IndicatorDashboard } from './IndicatorDashboard';
import { Play, Pause, RotateCcw, Zap, Shield, TrendingUp, Flame, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Strategy {
  id: string;
  name: string;
  description: string;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
}

interface StrategyInfo extends Strategy {
  tooltip: string;
  bestFor: string;
}

const STRATEGIES: StrategyInfo[] = [
  // Conservative
  { 
    id: 'smart-dca', 
    name: 'Smart DCA', 
    description: 'Automated dollar-cost averaging with RSI-adjusted amounts', 
    riskLevel: 'conservative',
    tooltip: 'Dollar-Cost Averaging buys fixed amounts regularly, but this smart version increases purchases when RSI shows oversold conditions (good buying opportunity) and decreases when overbought.',
    bestFor: 'Long-term wealth building with minimal monitoring'
  },
  { 
    id: 'bollinger-reversion', 
    name: 'Mean Reversion', 
    description: 'Buy at lower Bollinger Band, sell at upper', 
    riskLevel: 'conservative',
    tooltip: 'Bollinger Bands show price volatility. When price touches the lower band with low RSI, it suggests the asset is oversold and likely to "revert to the mean" (bounce back up).',
    bestFor: 'Range-bound, sideways markets'
  },
  // Moderate
  { 
    id: 'macd-crossover', 
    name: 'MACD Crossover', 
    description: 'Trend-following with MACD + SMA50 confirmation', 
    riskLevel: 'moderate',
    tooltip: 'MACD (Moving Average Convergence Divergence) identifies trend changes. Buy signals occur when the MACD line crosses above its signal line AND price is above the 50-day average.',
    bestFor: 'Trending markets with clear direction'
  },
  { 
    id: 'multi-indicator', 
    name: 'Multi-Indicator', 
    description: '5-indicator consensus voting system', 
    riskLevel: 'moderate',
    tooltip: 'Uses 5 indicators (RSI, MACD, Trend, Bollinger, Momentum) that each "vote" bullish or bearish. Only trades when 3+ indicators agree, reducing false signals.',
    bestFor: 'Balanced approach with confirmation'
  },
  // Aggressive
  { 
    id: 'grid-trading', 
    name: 'Grid Trading', 
    description: 'Automated buy/sell at price grid levels', 
    riskLevel: 'aggressive',
    tooltip: 'Places virtual buy orders below current price and sell orders above, profiting from price oscillations. Works best when price bounces within a range.',
    bestFor: 'Volatile sideways markets with oscillation'
  },
  { 
    id: 'momentum-breakout', 
    name: 'Breakout', 
    description: 'Buy 20-period highs with momentum surge', 
    riskLevel: 'aggressive',
    tooltip: 'Buys when price breaks above its 20-period high with volume confirmation, betting on continued momentum. Uses tight 2% stop-loss to limit downside.',
    bestFor: 'Strong trending markets with breakouts'
  },
];

const RISK_GROUPS = {
  conservative: { 
    label: 'Conservative', 
    icon: Shield, 
    color: 'text-green-500',
    tooltip: 'Lower risk strategies focused on steady accumulation and mean reversion. Smaller position sizes, wider stop-losses.'
  },
  moderate: { 
    label: 'Moderate', 
    icon: TrendingUp, 
    color: 'text-yellow-500',
    tooltip: 'Balanced strategies combining multiple indicators for confirmation. Medium position sizes with reasonable risk/reward.'
  },
  aggressive: { 
    label: 'Aggressive', 
    icon: Flame, 
    color: 'text-red-500',
    tooltip: 'Higher risk strategies for volatile markets. Larger positions, tighter stops, potential for bigger gains and losses.'
  },
};

const STARTING_BALANCE = 10000;

interface IndicatorVotes {
  rsi: -1 | 0 | 1;
  macd: -1 | 0 | 1;
  trend: -1 | 0 | 1;
  bollinger: -1 | 0 | 1;
  momentum: -1 | 0 | 1;
  totalScore: number;
}

interface RiskMetrics {
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  positionSizeMultiplier: number;
  volatilityLevel: 'low' | 'medium' | 'high';
}

interface TickData {
  symbol: string;
  price: number;
  change24h: number;
  rsi: number;
  sma20: number;
  bollingerUpper: number;
  bollingerLower: number;
  bollingerPercentB: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
  atr: number;
  high20: number;
  low20: number;
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  indicatorVotes: IndicatorVotes;
  riskMetrics: RiskMetrics;
}

interface LiveDemoEngineProps {
  onClose?: () => void;
}

export const LiveDemoEngine = ({ onClose }: LiveDemoEngineProps) => {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(STRATEGIES[3]); // Multi-indicator default
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<DecisionStep[]>([]);
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [positions, setPositions] = useState<DemoPosition[]>([]);
  const [trades, setTrades] = useState<DemoTrade[]>([]);
  const [lastSignal, setLastSignal] = useState<{ signal: string; reasoning: string } | null>(null);
  const [tickCount, setTickCount] = useState(0);
  const [tickData, setTickData] = useState<TickData | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const filteredStrategies = STRATEGIES.filter(s => s.riskLevel === selectedRiskLevel);

  const resetDemo = useCallback(() => {
    setBalance(STARTING_BALANCE);
    setPositions([]);
    setTrades([]);
    setSteps([]);
    setLastSignal(null);
    setTickCount(0);
    setTickData(null);
  }, []);

  // Update selected strategy when risk level changes
  useEffect(() => {
    const firstInLevel = STRATEGIES.find(s => s.riskLevel === selectedRiskLevel);
    if (firstInLevel && selectedStrategy.riskLevel !== selectedRiskLevel) {
      setSelectedStrategy(firstInLevel);
    }
  }, [selectedRiskLevel, selectedStrategy.riskLevel]);

  const runTick = useCallback(async () => {
    // Initialize steps
    setSteps([
      { id: 'fetch', name: 'Fetching Market Data', status: 'loading' },
      { id: 'indicators', name: 'Computing Indicators', status: 'pending' },
      { id: 'analyze', name: 'Strategy Analysis', status: 'pending' },
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
      
      setTickData(data);

      setSteps(prev => prev.map(s => 
        s.id === 'fetch' ? { 
          ...s, 
          status: 'success', 
          value: `BTC: $${data.price?.toLocaleString()} (${data.change24h > 0 ? '+' : ''}${data.change24h?.toFixed(2)}%)`, 
          duration: Date.now() - fetchStart 
        } : s
      ));

      // Step 2: Indicators
      await new Promise(r => setTimeout(r, 200));
      setSteps(prev => prev.map(s => 
        s.id === 'indicators' ? { ...s, status: 'loading' } : s
      ));
      await new Promise(r => setTimeout(r, 300));
      setSteps(prev => prev.map(s => 
        s.id === 'indicators' ? { 
          ...s, 
          status: 'success', 
          value: `RSI: ${data.rsi?.toFixed(0)} | MACD: ${data.macdHistogram?.toFixed(0)} | BB%: ${(data.bollingerPercentB * 100)?.toFixed(0)}%`, 
          duration: 300 
        } : s
      ));

      // Step 3: Strategy Analysis
      await new Promise(r => setTimeout(r, 200));
      setSteps(prev => prev.map(s => 
        s.id === 'analyze' ? { ...s, status: 'loading' } : s
      ));
      await new Promise(r => setTimeout(r, 400));
      
      const votesSummary = `Votes: ${data.indicatorVotes?.totalScore > 0 ? '+' : ''}${data.indicatorVotes?.totalScore}/5`;
      setSteps(prev => prev.map(s => 
        s.id === 'analyze' ? { 
          ...s, 
          status: 'success', 
          value: `${data.signal?.toUpperCase()} (${(data.confidence * 100).toFixed(0)}%) | ${votesSummary}`, 
          duration: 400 
        } : s
      ));
      setLastSignal({ signal: data.signal, reasoning: data.reasoning });

      // Step 4: Risk Assessment
      await new Promise(r => setTimeout(r, 200));
      setSteps(prev => prev.map(s => 
        s.id === 'risk' ? { ...s, status: 'loading' } : s
      ));
      await new Promise(r => setTimeout(r, 250));
      
      const currentPosition = positions.find(p => p.symbol === 'BTC');
      const positionValue = currentPosition ? currentPosition.quantity * data.price : 0;
      const maxPositionPercent = data.riskMetrics?.positionSizeMultiplier * 0.2; // Max 20% adjusted by volatility
      const riskOk = positionValue < balance * maxPositionPercent;
      
      setSteps(prev => prev.map(s => 
        s.id === 'risk' ? { 
          ...s, 
          status: 'success', 
          value: `${data.riskMetrics?.volatilityLevel?.toUpperCase()} volatility | SL: $${data.riskMetrics?.suggestedStopLoss?.toLocaleString()}`, 
          duration: 250 
        } : s
      ));

      // Step 5: Execute
      await new Promise(r => setTimeout(r, 200));
      setSteps(prev => prev.map(s => 
        s.id === 'execute' ? { ...s, status: 'loading' } : s
      ));
      await new Promise(r => setTimeout(r, 300));

      // Execute trade logic with volatility-adjusted sizing
      const positionSizeMultiplier = data.riskMetrics?.positionSizeMultiplier || 1;
      
      if (data.signal === 'buy' && data.confidence > 0.6 && riskOk && !currentPosition) {
        // Buy: use adjusted percentage of balance
        const basePercent = 0.1;
        const adjustedPercent = basePercent * positionSizeMultiplier;
        const tradeAmount = balance * adjustedPercent;
        const quantity = tradeAmount / data.price;
        
        setBalance(prev => prev - tradeAmount);
        setPositions([{
          symbol: 'BTC',
          quantity,
          avgPrice: data.price,
          currentPrice: data.price,
          unrealizedPnl: 0,
          stopLoss: data.riskMetrics?.suggestedStopLoss,
          takeProfit: data.riskMetrics?.suggestedTakeProfit
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
          s.id === 'execute' ? { 
            ...s, 
            status: 'success', 
            value: `Bought ${quantity.toFixed(6)} BTC @ $${data.price.toLocaleString()} (${(adjustedPercent * 100).toFixed(0)}% position)`, 
            duration: 300 
          } : s
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
          s.id === 'execute' ? { 
            ...s, 
            status: 'success', 
            value: `Sold @ $${data.price.toLocaleString()} (${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)})`, 
            duration: 300 
          } : s
        ));
      } else if (currentPosition) {
        // Check stop-loss and take-profit
        const stopHit = currentPosition.stopLoss && data.price <= currentPosition.stopLoss;
        const tpHit = currentPosition.takeProfit && data.price >= currentPosition.takeProfit;
        
        if (stopHit || tpHit) {
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
            s.id === 'execute' ? { 
              ...s, 
              status: 'success', 
              value: `${stopHit ? 'Stop-loss' : 'Take-profit'} triggered @ $${data.price.toLocaleString()} (${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)})`, 
              duration: 300 
            } : s
          ));
        } else {
          setSteps(prev => prev.map(s => 
            s.id === 'execute' ? { 
              ...s, 
              status: 'success', 
              value: 'Holding position - SL/TP not triggered', 
              duration: 300 
            } : s
          ));
        }
      } else {
        setSteps(prev => prev.map(s => 
          s.id === 'execute' ? { 
            ...s, 
            status: 'success', 
            value: data.signal === 'hold' ? 'No action - waiting for signal' : 'Conditions not met', 
            duration: 300 
          } : s
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

  const RiskIcon = RISK_GROUPS[selectedRiskLevel].icon;

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
        <TooltipProvider delayDuration={300}>
          {/* Risk Level Selector */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {(Object.keys(RISK_GROUPS) as Array<keyof typeof RISK_GROUPS>).map(level => {
              const { label, icon: Icon, color, tooltip } = RISK_GROUPS[level];
              const isSelected = selectedRiskLevel === level;
              return (
                <Tooltip key={level}>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={isSelected ? 'default' : 'ghost'}
                      onClick={() => {
                        setSelectedRiskLevel(level);
                        if (!isRunning) resetDemo();
                      }}
                      disabled={isRunning}
                      className={cn("flex-1 gap-1", isSelected && color)}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">
                    <p className="text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Strategy Selection */}
          <div className="grid grid-cols-2 gap-2">
            {filteredStrategies.map(strategy => (
              <Tooltip key={strategy.id}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={selectedStrategy.id === strategy.id ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedStrategy(strategy);
                      if (!isRunning) resetDemo();
                    }}
                    disabled={isRunning}
                    className="h-auto py-2 flex-col items-start text-left"
                  >
                    <div className="flex items-center gap-1 w-full">
                      <span className="font-medium">{strategy.name}</span>
                      <HelpCircle className="h-3 w-3 text-muted-foreground/50 ml-auto" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-normal line-clamp-1">
                      {strategy.description}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px]">
                  <p className="font-medium text-xs mb-1">{strategy.name}</p>
                  <p className="text-xs text-muted-foreground">{strategy.tooltip}</p>
                  <p className="text-xs text-primary mt-1.5">Best for: {strategy.bestFor}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
        
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
        
        {/* Indicator Dashboard */}
        {tickData && (
          <div className="bg-muted/30 rounded-lg p-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">Technical Indicators</h4>
            <IndicatorDashboard 
              indicators={{
                rsi: tickData.rsi,
                sma20: tickData.sma20,
                bollingerUpper: tickData.bollingerUpper,
                bollingerLower: tickData.bollingerLower,
                bollingerPercentB: tickData.bollingerPercentB,
                macdHistogram: tickData.macdHistogram,
                atr: tickData.atr,
                high20: tickData.high20,
                low20: tickData.low20,
                price: tickData.price
              }}
              votes={tickData.indicatorVotes}
              riskMetrics={tickData.riskMetrics}
            />
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
