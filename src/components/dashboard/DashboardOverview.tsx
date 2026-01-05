import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Plus, TrendingUp, Zap, AlertCircle, Key } from "lucide-react";
import { ExecutionHistory } from "./ExecutionHistory";
import { QuickDemo } from "@/components/onboarding/QuickDemo";
import { ReadyMadeAgents } from "@/components/agents/ReadyMadeAgents";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { QuickConnect } from "@/components/exchange/QuickConnect";

export const DashboardOverview = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [stats, setStats] = useState({
    activeAgents: 0,
    portfolioValue: 0,
    totalExecutions: 0,
    activeAlerts: 0,
  });
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [showQuickConnect, setShowQuickConnect] = useState(false);

  useEffect(() => {
    loadUserAndStats();
  }, []);

  const loadUserAndStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      
      // Load stats in parallel
      const [agentsRes, portfolioRes, executionsRes, alertsRes, connectionsRes] = await Promise.all([
        supabase.from('agents').select('id').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('portfolios').select('current_value').eq('user_id', user.id),
        supabase.from('executions').select('id').eq('user_id', user.id),
        supabase.from('alerts').select('id').eq('user_id', user.id).eq('is_read', false),
        supabase.from('exchange_connections').select('id').eq('user_id', user.id).eq('is_active', true),
      ]);

      const portfolioValue = portfolioRes.data?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0;
      const hasConnection = (connectionsRes.data?.length || 0) > 0;
      const hasPortfolioData = (portfolioRes.data?.length || 0) > 0;

      setStats({
        activeAgents: agentsRes.data?.length || 0,
        portfolioValue,
        totalExecutions: executionsRes.data?.length || 0,
        activeAlerts: alertsRes.data?.length || 0,
      });

      setHasPortfolio(hasConnection || hasPortfolioData);
      
      // Check if onboarding is complete
      const { data: profileData } = await supabase
        .from('profiles')
        .select('risk_tolerance, investor_type')
        .eq('id', user.id)
        .single();

      const hasProfile = !!(profileData?.risk_tolerance && profileData?.investor_type);
      const hasAgent = (agentsRes.data?.length || 0) > 0;
      
      setIsOnboardingComplete(hasProfile && (hasConnection || hasPortfolioData) && hasAgent);
    }
  };

  const handleConnectionSuccess = () => {
    setShowQuickConnect(false);
    setHasPortfolio(true);
    loadUserAndStats();
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

      {/* Quick Demo - No Setup Required */}
      <QuickDemo onStartFull={() => setShowQuickConnect(true)} />

      {/* Ready-Made Agents */}
      <ReadyMadeAgents 
        hasPortfolioConnected={hasPortfolio} 
        onConnectPortfolio={() => setShowQuickConnect(true)} 
      />

      {/* Execution History */}
      <ExecutionHistory />

      {/* Quick Connect Dialog */}
      <Dialog open={showQuickConnect} onOpenChange={setShowQuickConnect}>
        <DialogContent className="max-w-md">
          <QuickConnect onSuccess={handleConnectionSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
