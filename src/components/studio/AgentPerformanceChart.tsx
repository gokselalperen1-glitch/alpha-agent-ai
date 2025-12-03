import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface PerformanceData {
  date: string;
  pnl: number;
  trades: number;
  volume: number;
}

interface AgentPerformanceChartProps {
  agentId: string;
  userId: string;
}

export const AgentPerformanceChart = ({ agentId, userId }: AgentPerformanceChartProps) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPnL, setTotalPnL] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [avgTradeSize, setAvgTradeSize] = useState(0);

  useEffect(() => {
    loadPerformanceData();
  }, [agentId]);

  const loadPerformanceData = async () => {
    // Get all transactions for this agent
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('agent_id', agentId)
      .order('executed_at', { ascending: true });

    if (error || !transactions) {
      setLoading(false);
      return;
    }

    // Group by date and calculate P&L
    const dailyData = new Map<string, { pnl: number; trades: number; volume: number; wins: number }>();
    let runningPnL = 0;
    let totalWins = 0;
    let totalTrades = transactions.length;
    let totalVolume = 0;

    transactions.forEach((tx) => {
      const date = new Date(tx.executed_at).toLocaleDateString();
      const existing = dailyData.get(date) || { pnl: 0, trades: 0, volume: 0, wins: 0 };
      
      // Simple P&L calculation (buy = negative, sell = positive)
      const tradePnL = tx.transaction_type === 'sell' ? tx.total_value : -tx.total_value;
      runningPnL += tradePnL;
      
      if (tradePnL > 0) totalWins++;
      totalVolume += tx.total_value;
      
      dailyData.set(date, {
        pnl: runningPnL,
        trades: existing.trades + 1,
        volume: existing.volume + tx.total_value,
        wins: existing.wins + (tradePnL > 0 ? 1 : 0),
      });
    });

    const chartData = Array.from(dailyData.entries()).map(([date, data]) => ({
      date,
      pnl: data.pnl,
      trades: data.trades,
      volume: data.volume,
    }));

    setPerformanceData(chartData);
    setTotalPnL(runningPnL);
    setWinRate(totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0);
    setAvgTradeSize(totalTrades > 0 ? totalVolume / totalTrades : 0);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (performanceData.length === 0) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No performance data yet</p>
        <p className="text-sm text-muted-foreground mt-1">Charts will appear after the agent executes some trades</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {totalPnL >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">Total P&L</p>
                <p className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${totalPnL.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className="text-xl font-bold">{winRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Trade</p>
                <p className="text-xl font-bold">${avgTradeSize.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P&L Chart */}
      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-4">Cumulative P&L</h4>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={totalPnL >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={totalPnL >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke={totalPnL >= 0 ? '#22c55e' : '#ef4444'}
                fill="url(#pnlGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume Chart */}
      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-4">Daily Volume</h4>
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line 
                type="monotone" 
                dataKey="volume" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
