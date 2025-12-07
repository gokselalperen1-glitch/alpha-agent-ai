import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';

interface QuickConnectProps {
  onSuccess?: (connectionId: string) => void;
  onCancel?: () => void;
}

const EXCHANGES = [
  { id: 'binance', name: 'Binance', logo: '🟡', requiresPassphrase: false },
  { id: 'coinbase', name: 'Coinbase', logo: '🔵', requiresPassphrase: true },
  { id: 'kraken', name: 'Kraken', logo: '🟣', requiresPassphrase: false },
  { id: 'bybit', name: 'Bybit', logo: '🟠', requiresPassphrase: false },
  { id: 'kucoin', name: 'KuCoin', logo: '🟢', requiresPassphrase: true },
  { id: 'okx', name: 'OKX', logo: '⚫', requiresPassphrase: true },
];

export const QuickConnect = ({ onSuccess, onCancel }: QuickConnectProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'select' | 'credentials' | 'success'>('select');
  const [selectedExchange, setSelectedExchange] = useState<typeof EXCHANGES[0] | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  
  const [credentials, setCredentials] = useState({
    apiKey: '',
    apiSecret: '',
    passphrase: '',
    isTestnet: true,
  });

  const handleSelectExchange = (exchange: typeof EXCHANGES[0]) => {
    setSelectedExchange(exchange);
    setStep('credentials');
  };

  const handleConnect = async () => {
    if (!selectedExchange) return;

    if (!credentials.apiKey || !credentials.apiSecret) {
      toast({
        title: 'Missing Credentials',
        description: 'Please enter your API key and secret',
        variant: 'destructive',
      });
      return;
    }

    if (selectedExchange.requiresPassphrase && !credentials.passphrase) {
      toast({
        title: 'Passphrase Required',
        description: `${selectedExchange.name} requires a passphrase`,
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke('manage-exchange-connection', {
        body: {
          action: 'save',
          exchangeName: selectedExchange.id,
          apiKey: credentials.apiKey,
          apiSecret: credentials.apiSecret,
          passphrase: credentials.passphrase || undefined,
          isTestnet: credentials.isTestnet,
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Connection failed');
      }

      setConnectionId(data.connection.id);
      setStep('success');

      // Auto-sync portfolio
      try {
        await supabase.functions.invoke('sync-portfolio', {
          body: { connectionId: data.connection.id },
        });
      } catch {
        // Silent fail for sync
      }

      toast({
        title: 'Connected!',
        description: `Successfully connected to ${selectedExchange.name}`,
      });
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

  if (step === 'success') {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="pt-6 text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <div>
            <h3 className="font-semibold text-lg">Connected to {selectedExchange?.name}!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your portfolio is now synced and ready for trading.
            </p>
          </div>
          <Button 
            onClick={() => connectionId && onSuccess?.(connectionId)}
            className="w-full"
          >
            Continue <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === 'credentials' && selectedExchange) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedExchange.logo}</span>
            <div>
              <CardTitle className="text-lg">Connect {selectedExchange.name}</CardTitle>
              <CardDescription>Enter your API credentials</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={credentials.apiKey}
              onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
              placeholder="Enter your API key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret</Label>
            <Input
              id="apiSecret"
              type="password"
              value={credentials.apiSecret}
              onChange={(e) => setCredentials({ ...credentials, apiSecret: e.target.value })}
              placeholder="Enter your API secret"
            />
          </div>

          {selectedExchange.requiresPassphrase && (
            <div className="space-y-2">
              <Label htmlFor="passphrase">Passphrase</Label>
              <Input
                id="passphrase"
                type="password"
                value={credentials.passphrase}
                onChange={(e) => setCredentials({ ...credentials, passphrase: e.target.value })}
                placeholder="Enter passphrase"
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-lg bg-accent/20">
            <div>
              <Label htmlFor="testnet" className="cursor-pointer">Use Testnet</Label>
              <p className="text-xs text-muted-foreground">Recommended for testing</p>
            </div>
            <Switch
              id="testnet"
              checked={credentials.isTestnet}
              onCheckedChange={(checked) => setCredentials({ ...credentials, isTestnet: checked })}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              onClick={() => setStep('select')} 
              className="flex-1"
              disabled={isConnecting}
            >
              Back
            </Button>
            <Button 
              onClick={handleConnect} 
              className="flex-1"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
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
        <CardTitle>Quick Connect</CardTitle>
        <CardDescription>Select your exchange to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {EXCHANGES.map((exchange) => (
            <Button
              key={exchange.id}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 hover:border-primary"
              onClick={() => handleSelectExchange(exchange)}
            >
              <span className="text-2xl">{exchange.logo}</span>
              <span className="font-medium">{exchange.name}</span>
            </Button>
          ))}
        </div>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} className="w-full mt-4">
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
