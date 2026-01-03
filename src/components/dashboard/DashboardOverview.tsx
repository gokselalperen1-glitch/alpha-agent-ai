import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Plus, TrendingUp, Zap, AlertCircle, Key } from "lucide-react";
import { ExecutionHistory } from "./ExecutionHistory";
import { QuickStartDashboard } from "@/components/agents/QuickStartDashboard";
import { supabase } from "@/integrations/supabase/client";

export const DashboardOverview = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [stats, setStats] = useState({
    activeAgents: 0,
    portfolioValue: 0,
    totalExecutions: 0,
    activeAlerts: 0,
  });

  useEffect(() => {
    loadUserAndStats();
  }, []);

  const loadUserAndStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      
      // Load stats in parallel
      const [agentsRes, portfolioRes, executionsRes, alertsRes] = await Promise.all([
        supabase.from('agents').select('id').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('portfolios').select('current_value').eq('user_id', user.id),
        supabase.from('executions').select('id').eq('user_id', user.id),
        supabase.from('alerts').select('id').eq('user_id', user.id).eq('is_read', false),
      ]);

      setStats({
        activeAgents: agentsRes.data?.length || 0,
        portfolioValue: portfolioRes.data?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0,
        totalExecutions: executionsRes.data?.length || 0,
        activeAlerts: alertsRes.data?.length || 0,
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to your InvestAI control center
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/api-keys')}>
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </Button>
          <Button className="gap-2" onClick={() => navigate('/agent-builder')}>
            <Plus className="h-4 w-4" />
            Create Agent
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAgents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeAgents === 0 ? 'Deploy an agent below' : 'Agents running'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.portfolioValue === 0 ? 'Connect portfolio to see value' : 'Total synced value'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExecutions}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeAlerts === 0 ? 'No unread alerts' : 'Unread alerts'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start Dashboard with Ready-Made Agents */}
      <QuickStartDashboard userId={userId} />

      {/* Execution History */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ExecutionHistory />
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Follow these steps to start automated trading</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Connect your exchange</p>
                <p className="text-sm text-muted-foreground">
                  Link Binance, Coinbase, Kraken, or other exchanges
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Choose a ready-made agent</p>
                <p className="text-sm text-muted-foreground">
                  Deploy Aladdin AI or other pre-configured strategies
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Start trading</p>
                <p className="text-sm text-muted-foreground">
                  Activate your agent and monitor performance
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
