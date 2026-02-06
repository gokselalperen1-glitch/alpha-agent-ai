import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Landmark, BarChart3, Activity } from "lucide-react";

interface DashboardStats {
  total_value: number;
  total_gain_loss: number;
  total_gain_loss_percent: number;
  holding_count: number;
  broker_count: number;
  recent_transactions: number;
}

export const InvestmentDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [holdingsRes, brokerRes, transactionRes] = await Promise.all([
        supabase.from('investment_holdings').select('*'),
        supabase.from('investment_broker_connections').select('*').eq('is_active', true),
        supabase.from('investment_transactions').select('*').order('transaction_date', { ascending: false }).limit(5),
      ]);

      const holdings = holdingsRes.data || [];
      const brokers = brokerRes.data || [];
      const transactions = transactionRes.data || [];

      const totalValue = holdings.reduce((sum, h) => sum + (h.market_value || 0), 0);
      const totalGainLoss = holdings.reduce((sum, h) => sum + (h.gain_loss || 0), 0);
      const totalGainLossPercent = totalValue > 0 ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 : 0;

      setStats({
        total_value: totalValue,
        total_gain_loss: totalGainLoss,
        total_gain_loss_percent: totalGainLossPercent,
        holding_count: holdings.length,
        broker_count: brokers.length,
        recent_transactions: transactions.length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.total_value.toFixed(2)}</div>
            <p className={`text-xs mt-1 ${(stats?.total_gain_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(stats?.total_gain_loss || 0) >= 0 ? '+' : ''}{stats?.total_gain_loss.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.holding_count}</div>
            <p className="text-xs text-muted-foreground mt-1">across {stats?.broker_count} broker{(stats?.broker_count || 0) !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Return</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.total_gain_loss_percent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(stats?.total_gain_loss_percent || 0) >= 0 ? '+' : ''}{stats?.total_gain_loss_percent.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Broker Connections
            </CardTitle>
            <CardDescription>
              {stats?.broker_count || 0} active connection{(stats?.broker_count || 0) !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Connect your investment accounts from Alpaca, Interactive Brokers, TD Ameritrade, and Aladdin.</p>
            <Button onClick={() => navigate('/investment-brokers')} variant="outline" size="sm" className="w-full">
              Manage Brokers
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Portfolio Holdings
            </CardTitle>
            <CardDescription>
              {stats?.holding_count || 0} asset{(stats?.holding_count || 0) !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">View all your holdings, performance, and asset allocation across all brokers.</p>
            <Button onClick={() => navigate('/investment-portfolio')} variant="outline" size="sm" className="w-full">
              View Holdings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Transaction History
            </CardTitle>
            <CardDescription>
              All trades and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Track all your buys, sells, dividends, and other portfolio activities.</p>
            <Button onClick={() => navigate('/investment-transactions')} variant="outline" size="sm" className="w-full">
              View Transactions
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance
            </CardTitle>
            <CardDescription>
              Real-time updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Monitor your portfolio performance with real-time price updates and gain/loss tracking.</p>
            <Button onClick={() => navigate('/investment-portfolio')} variant="outline" size="sm" className="w-full">
              View Performance
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Set up your investment portfolio in 3 easy steps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">1</div>
            <div>
              <h3 className="font-semibold">Connect Your Brokers</h3>
              <p className="text-sm text-muted-foreground">Add your API credentials from Alpaca, Interactive Brokers, TD Ameritrade, or Aladdin</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">2</div>
            <div>
              <h3 className="font-semibold">Sync Your Portfolio</h3>
              <p className="text-sm text-muted-foreground">Automatically sync your holdings, transactions, and account data</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">3</div>
            <div>
              <h3 className="font-semibold">Monitor & Manage</h3>
              <p className="text-sm text-muted-foreground">View all your holdings, transactions, and performance in one unified dashboard</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
