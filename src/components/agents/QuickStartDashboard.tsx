import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuickConnect } from '@/components/exchange/QuickConnect';
import { ReadyMadeAgents } from './ReadyMadeAgents';
import { supabase } from '@/integrations/supabase/client';
import { 
  Wallet, 
  Bot, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  BarChart3
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface QuickStartDashboardProps {
  userId?: string;
}

export const QuickStartDashboard = ({ userId }: QuickStartDashboardProps) => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [hasConnections, setHasConnections] = useState(false);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [assetCount, setAssetCount] = useState(0);
  const [agentCount, setAgentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  const loadUserData = async () => {
    try {
      // Check for exchange connections
      const { data: connections } = await supabase
        .from('exchange_connections')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true);

      setHasConnections((connections?.length || 0) > 0);

      // Get portfolio data
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('current_value, asset_symbol')
        .eq('user_id', userId);

      const totalValue = portfolios?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0;
      setPortfolioValue(totalValue);
      setAssetCount(portfolios?.length || 0);

      // Get agent count
      const { data: agents } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', userId);

      setAgentCount(agents?.length || 0);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionSuccess = () => {
    setShowConnectModal(false);
    setHasConnections(true);
    loadUserData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Portfolio Status */}
        <Card className={hasConnections ? 'border-green-500/30' : 'border-amber-500/30'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Portfolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasConnections ? (
              <div className="space-y-2">
                <p className="text-2xl font-bold">
                  ${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">
                    {assetCount} assets connected
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect your exchange to start trading
                </p>
                <Button 
                  size="sm" 
                  onClick={() => setShowConnectModal(true)}
                  className="w-full"
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Portfolio
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Agents */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Active Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{agentCount}</p>
            <p className="text-sm text-muted-foreground">
              {agentCount === 0 ? 'Deploy your first agent below' : 'Trading agents running'}
            </p>
          </CardContent>
        </Card>

        {/* AI Status */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-primary">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Aladdin AI & Lovable AI available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start Flow */}
      {!hasConnections && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Get Started in 2 Minutes</h3>
                  <p className="text-muted-foreground">
                    Connect your exchange, choose an AI agent, and start automated trading
                  </p>
                </div>
              </div>
              <Button 
                size="lg" 
                onClick={() => setShowConnectModal(true)}
                className="whitespace-nowrap"
              >
                Connect Exchange
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ready-Made Agents */}
      <ReadyMadeAgents 
        hasPortfolioConnected={hasConnections} 
        onConnectPortfolio={() => setShowConnectModal(true)}
      />

      {/* Connect Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Your Exchange</DialogTitle>
          </DialogHeader>
          <QuickConnect 
            onSuccess={handleConnectionSuccess}
            onCancel={() => setShowConnectModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
