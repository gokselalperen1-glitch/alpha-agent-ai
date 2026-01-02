import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { QuickConnect } from '@/components/exchange/QuickConnect';
import { supabase } from '@/integrations/supabase/client';
import { 
  ChevronDown, 
  ChevronUp, 
  Link2, 
  CheckCircle, 
  AlertCircle, 
  Wallet,
  RefreshCw,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExchangeConnection {
  id: string;
  exchange_name: string;
  is_testnet: boolean;
  health_status: string | null;
  permissions: any;
}

interface PortfolioSummary {
  totalValue: number;
  assetCount: number;
}

export const ConnectionSetupPanel = () => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load exchange connections
      const { data: conns } = await supabase
        .from('exchange_connections')
        .select('id, exchange_name, is_testnet, health_status, permissions')
        .eq('user_id', user.id)
        .eq('is_active', true);

      setConnections(conns || []);

      // Load portfolio summary
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('current_value, asset_symbol')
        .eq('user_id', user.id);

      if (portfolios && portfolios.length > 0) {
        const totalValue = portfolios.reduce((sum, p) => sum + (p.current_value || 0), 0);
        setPortfolio({
          totalValue,
          assetCount: portfolios.length,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncPortfolio = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-portfolio', {});
      
      if (error) throw error;

      toast({
        title: 'Portfolio Synced',
        description: `Synced ${data?.portfolioData?.length || 0} assets`,
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const hasConnections = connections.length > 0;

  return (
    <div className="border-b border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-between px-4 py-3 h-auto"
          >
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              <span className="font-medium">Connections</span>
              {hasConnections && (
                <Badge variant="secondary" className="ml-2">
                  {connections.length}
                </Badge>
              )}
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Loading...
              </div>
            ) : showQuickConnect ? (
              <QuickConnect 
                compact 
                onSuccess={() => {
                  setShowQuickConnect(false);
                  loadData();
                }}
                onCancel={() => setShowQuickConnect(false)}
              />
            ) : (
              <>
                {/* Connected Exchanges */}
                {connections.map((conn) => (
                  <Card key={conn.id} className="bg-muted/30">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded bg-background flex items-center justify-center">
                            <span className="text-xs font-medium uppercase">
                              {conn.exchange_name.slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-sm capitalize">
                              {conn.exchange_name}
                            </div>
                            <div className="flex items-center gap-1">
                              {conn.is_testnet && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  Testnet
                                </Badge>
                              )}
                              {conn.health_status === 'healthy' ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-amber-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Portfolio Summary */}
                {portfolio && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-primary" />
                          <div>
                            <div className="text-sm font-medium">
                              ${portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {portfolio.assetCount} assets
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={syncPortfolio}
                          disabled={isSyncing}
                        >
                          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setShowQuickConnect(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {hasConnections ? 'Add Exchange' : 'Connect Exchange'}
                  </Button>
                  {hasConnections && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={syncPortfolio}
                      disabled={isSyncing}
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </div>

                {!hasConnections && (
                  <p className="text-xs text-muted-foreground text-center">
                    Connect an exchange to enable real trading
                  </p>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
