import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, DollarSign, Target, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemoPerformanceProps {
  agentName?: string;
  riskLevel?: 'conservative' | 'moderate' | 'aggressive';
}

export const DemoPerformance = ({ agentName = 'AI Agent', riskLevel = 'moderate' }: DemoPerformanceProps) => {
  const [metrics, setMetrics] = useState({
    totalReturn: 0,
    winRate: 0,
    totalTrades: 0,
    avgProfit: 0,
  });
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [isAnimating, setIsAnimating] = useState(true);

  // Generate realistic demo performance based on risk level
  useEffect(() => {
    const baseReturns = {
      conservative: { min: 5, max: 12 },
      moderate: { min: 8, max: 18 },
      aggressive: { min: 12, max: 28 },
    };

    const base = baseReturns[riskLevel];
    const totalReturn = base.min + Math.random() * (base.max - base.min);
    const winRate = 55 + Math.random() * 20;
    const totalTrades = Math.floor(50 + Math.random() * 100);
    const avgProfit = totalReturn / totalTrades * 10;

    // Animate metrics
    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.05;
      if (progress >= 1) {
        progress = 1;
        clearInterval(interval);
        setIsAnimating(false);
      }
      setMetrics({
        totalReturn: totalReturn * progress,
        winRate: winRate * progress,
        totalTrades: Math.floor(totalTrades * progress),
        avgProfit: avgProfit * progress,
      });
    }, 50);

    // Generate demo trades
    const trades = generateDemoTrades(10, riskLevel);
    setRecentTrades(trades);

    return () => clearInterval(interval);
  }, [riskLevel]);

  return (
    <div className="space-y-4">
      {/* Performance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Total Return</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              +{metrics.totalReturn.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium">Win Rate</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {metrics.winRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">Total Trades</span>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {metrics.totalTrades}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Avg Profit</span>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ${metrics.avgProfit.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trades */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Recent Simulated Trades</CardTitle>
            <Badge variant="outline" className="text-xs">Demo Data</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentTrades.map((trade, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg transition-all",
                  "bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                    trade.type === 'buy' 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  )}>
                    {trade.type === 'buy' ? 'B' : 'S'}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{trade.symbol}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {trade.time}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">${trade.price.toFixed(2)}</div>
                  <div className={cn(
                    "text-xs",
                    trade.profit >= 0 ? "text-emerald-600" : "text-red-600"
                  )}>
                    {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function generateDemoTrades(count: number, riskLevel: string) {
  const symbols = ['BTC', 'ETH', 'SOL', 'ADA', 'MATIC'];
  const times = ['2m ago', '5m ago', '12m ago', '28m ago', '45m ago', '1h ago', '2h ago', '3h ago', '5h ago', '8h ago'];
  
  const volatility = {
    conservative: { min: -1, max: 3 },
    moderate: { min: -2, max: 5 },
    aggressive: { min: -4, max: 8 },
  }[riskLevel] || { min: -2, max: 5 };

  return Array.from({ length: count }, (_, i) => ({
    symbol: symbols[Math.floor(Math.random() * symbols.length)],
    type: Math.random() > 0.5 ? 'buy' : 'sell',
    price: 100 + Math.random() * 50000,
    profit: volatility.min + Math.random() * (volatility.max - volatility.min),
    time: times[i] || `${i}h ago`,
  }));
}
