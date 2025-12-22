import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CheckCircle, 
  Loader2, 
  Wallet, 
  ArrowRight, 
  RefreshCw,
  Shield,
  TrendingUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface SimplifiedPortfolioConnectProps {
  onConnected?: (connectionId: string) => void;
  compact?: boolean;
}

const POPULAR_EXCHANGES = [
  { 
    id: 'binance', 
    name: 'Binance', 
    icon: '🟡', 
    color: 'from-yellow-500/20 to-yellow-600/10',
    description: 'World\'s largest exchange',
    requiresPassphrase: false 
  },
  { 
    id: 'coinbase', 
    name: 'Coinbase', 
    icon: '🔵', 
    color: 'from-blue-500/20 to-blue-600/10',
    description: 'US regulated exchange',
    requiresPassphrase: true 
  },
  { 
    id: 'kraken', 
    name: 'Kraken', 
    icon: '🟣', 
    color: 'from-purple-500/20 to-purple-600/10',
    description: 'Advanced trading features',
    requiresPassphrase: false 
  },
  { 
    id: 'bybit', 
    name: 'Bybit', 
    icon: '🟠', 
    color: 'from-orange-500/20 to-orange-600/10',
    description: 'Derivatives trading',
    requiresPassphrase: false 
  },
];

export const SimplifiedPortfolioConnect = ({ onConnected, compact = false }: SimplifiedPortfolioConnectProps) => {
  const { toast } = useToast();
  const [selectedExchange, setSelectedExchange] = useState<typeof POPULAR_EXCHANGES[0] | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  
  const [credentials, setCredentials] = useState({
    apiKey: '',
    apiSecret: '',
    passphrase: '',
    useTestnet: true,
  });

  const handleConnect = async () => {
    if (!selectedExchange) return;
    
    if (!credentials.apiKey.trim() || !credentials.apiSecret.trim()) {
      toast({
        title: 'Missing Credentials',
        description: 'Please enter both API key and secret',
        variant: 'destructive',
      });
      return;
    }

    if (selectedExchange.requiresPassphrase && !credentials.passphrase.trim()) {
      toast({
        title: 'Passphrase Required',
        description: `${selectedExchange.name} requires a passphrase`,
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);

    try {
      // Save connection
      const { data, error } = await supabase.functions.invoke('manage-exchange-connection', {
        body: {
          action: 'save',
          exchangeName: selectedExchange.id,
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret,
          passphrase: credentials.passphrase || undefined,
          isTestnet: credentials.useTestnet,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Connection failed');
      }

      // Sync portfolio immediately
      const syncResult = await supabase.functions.invoke('sync-portfolio', {
        body: { connectionId: data.connection.id },
      });

      setPortfolioData(syncResult.data);
      setConnectionSuccess(true);

      toast({
        title: 'Portfolio Connected!',
        description: `Successfully synced with ${selectedExchange.name}`,
      });

      onConnected?.(data.connection.id);
    } catch (err: any) {
      toast({
        title: 'Connection Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const resetForm = () => {
    setSelectedExchange(null);
    setConnectionSuccess(false);
    setPortfolioData(null);
    setCredentials({
      apiKey: '',
      apiSecret: '',
      passphrase: '',
      useTestnet: true,
    });
  };

  if (connectionSuccess) {
    return (
      <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-600/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Portfolio Connected!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your {selectedExchange?.name} portfolio is now synced
              </p>
            </div>
            {portfolioData?.balances && (
              <div className="p-4 rounded-lg bg-background/50 text-left">
                <p className="text-xs text-muted-foreground mb-2">Portfolio Summary</p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="font-medium">
                    {portfolioData.balances.length} assets synced
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Add Another
              </Button>
              <Button onClick={() => onConnected?.('')} className="flex-1">
                Continue <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (selectedExchange) {
    return (
      <Card className={`bg-gradient-to-br ${selectedExchange.color}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{selectedExchange.icon}</span>
            <div>
              <CardTitle>Connect {selectedExchange.name}</CardTitle>
              <CardDescription>Enter your API credentials</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-background/50 flex items-start gap-2">
            <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Your API keys are encrypted and stored securely. We only request read and trade permissions.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="apiKey" className="text-sm">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={credentials.apiKey}
                onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                placeholder="Paste your API key"
                className="bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="apiSecret" className="text-sm">API Secret</Label>
              <Input
                id="apiSecret"
                type="password"
                value={credentials.apiSecret}
                onChange={(e) => setCredentials({ ...credentials, apiSecret: e.target.value })}
                placeholder="Paste your API secret"
                className="bg-background"
              />
            </div>

            {selectedExchange.requiresPassphrase && (
              <div className="space-y-1.5">
                <Label htmlFor="passphrase" className="text-sm">Passphrase</Label>
                <Input
                  id="passphrase"
                  type="password"
                  value={credentials.passphrase}
                  onChange={(e) => setCredentials({ ...credentials, passphrase: e.target.value })}
                  placeholder="Enter passphrase"
                  className="bg-background"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div>
                <Label htmlFor="testnet" className="text-sm font-medium cursor-pointer">
                  Use Testnet
                </Label>
                <p className="text-xs text-muted-foreground">Safe mode for testing</p>
              </div>
              <Switch
                id="testnet"
                checked={credentials.useTestnet}
                onCheckedChange={(checked) => setCredentials({ ...credentials, useTestnet: checked })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedExchange(null)} 
              disabled={isConnecting}
              className="flex-1"
            >
              Back
            </Button>
            <Button 
              onClick={handleConnect} 
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Portfolio
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Connect Your Portfolio
        </CardTitle>
        <CardDescription>
          Select your exchange to sync your portfolio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={compact ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-2 gap-3'}>
          {POPULAR_EXCHANGES.map((exchange) => (
            <button
              key={exchange.id}
              onClick={() => setSelectedExchange(exchange)}
              className={`relative p-4 rounded-xl border bg-gradient-to-br ${exchange.color} hover:border-primary/50 transition-all hover:scale-[1.02] text-left group`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{exchange.icon}</span>
                <div>
                  <p className="font-medium text-sm">{exchange.name}</p>
                  {!compact && (
                    <p className="text-xs text-muted-foreground">{exchange.description}</p>
                  )}
                </div>
              </div>
              <ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};