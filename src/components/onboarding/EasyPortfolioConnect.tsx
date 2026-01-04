import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  PlayCircle, 
  TestTube, 
  Wallet,
  ArrowRight,
  Check,
  Loader2,
  ExternalLink,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InvestmentProfile } from './InvestmentProfileWizard';

interface EasyPortfolioConnectProps {
  profile?: InvestmentProfile;
  onComplete: () => void;
  onSkip?: () => void;
}

const CONNECTION_MODES = [
  {
    id: 'demo',
    label: 'Demo Mode',
    description: 'Try with simulated portfolio data',
    icon: PlayCircle,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    recommended: true,
    features: ['No API keys needed', 'Instant access', 'Safe for learning'],
  },
  {
    id: 'testnet',
    label: 'Testnet',
    description: 'Connect to Binance testnet',
    icon: TestTube,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    features: ['Real exchange interface', 'Fake money', 'Practice trading'],
  },
  {
    id: 'live',
    label: 'Live Exchange',
    description: 'Connect your real exchange',
    icon: Wallet,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    features: ['Real trading', 'Full functionality', 'Start with paper mode'],
  },
];

const ALLOCATION_SUGGESTIONS: Record<string, { asset: string; percentage: number }[]> = {
  conservative: [
    { asset: 'BTC', percentage: 60 },
    { asset: 'ETH', percentage: 30 },
    { asset: 'USDT', percentage: 10 },
  ],
  moderate: [
    { asset: 'BTC', percentage: 50 },
    { asset: 'ETH', percentage: 35 },
    { asset: 'ALT', percentage: 15 },
  ],
  aggressive: [
    { asset: 'BTC', percentage: 30 },
    { asset: 'ETH', percentage: 25 },
    { asset: 'ALT', percentage: 45 },
  ],
};

export const EasyPortfolioConnect = ({ profile, onComplete, onSkip }: EasyPortfolioConnectProps) => {
  const { toast } = useToast();
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const allocation = profile?.riskTolerance 
    ? ALLOCATION_SUGGESTIONS[profile.riskTolerance] 
    : ALLOCATION_SUGGESTIONS.moderate;

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (selectedMode === 'demo') {
        // Create demo portfolio entries
        const demoAssets = [
          { symbol: 'BTC', quantity: 0.5, value: 21500 },
          { symbol: 'ETH', quantity: 5, value: 8750 },
          { symbol: 'USDT', quantity: 3000, value: 3000 },
        ];

        for (const asset of demoAssets) {
          await supabase.from('portfolios').upsert({
            user_id: user.id,
            asset_symbol: asset.symbol,
            quantity: asset.quantity,
            current_value: asset.value,
            average_buy_price: asset.value / asset.quantity,
          }, {
            onConflict: 'user_id,asset_symbol',
          });
        }

        toast({
          title: 'Demo Portfolio Created',
          description: 'You can now explore all features with simulated data',
        });
      } else if (selectedMode === 'testnet' || selectedMode === 'live') {
        if (!apiKey || !apiSecret) {
          toast({
            title: 'API Keys Required',
            description: 'Please enter your API key and secret',
            variant: 'destructive',
          });
          setIsConnecting(false);
          return;
        }

        const { error } = await supabase.functions.invoke('manage-exchange-connection', {
          body: {
            action: 'create',
            exchange: 'binance',
            credentials: {
              apiKey,
              apiSecret,
            },
            isTestnet: selectedMode === 'testnet',
          },
        });

        if (error) throw error;

        toast({
          title: 'Exchange Connected',
          description: `Your ${selectedMode === 'testnet' ? 'testnet' : 'live'} account is now connected`,
        });
      }

      // Update user profile
      if (profile) {
        await supabase.from('profiles').upsert({
          id: user.id,
          risk_tolerance: profile.riskTolerance,
          investor_type: profile.investorType,
          investment_goals: profile.investmentGoals,
        });
      }

      onComplete();
    } catch (error: any) {
      console.error('Connection error:', error);
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-border/50 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">Portfolio Setup</Badge>
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
              Skip for now
            </Button>
          )}
        </div>
        <CardTitle className="text-xl">Connect Your Portfolio</CardTitle>
        <CardDescription>
          Choose how you want to get started
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Connection Mode Selection */}
        <div className="grid gap-3">
          {CONNECTION_MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left",
                  "hover:border-primary/50",
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-border bg-card"
                )}
              >
                <div className={cn("p-2.5 rounded-lg shrink-0", mode.bgColor)}>
                  <Icon className={cn("h-5 w-5", mode.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{mode.label}</span>
                    {mode.recommended && (
                      <Badge className="text-[10px] bg-primary/10 text-primary border-0">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{mode.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {mode.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs font-normal">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
                {isSelected && <Check className="h-5 w-5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* API Key Input for testnet/live */}
        {(selectedMode === 'testnet' || selectedMode === 'live') && (
          <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {selectedMode === 'testnet' 
                  ? 'Get testnet API keys from Binance Testnet'
                  : 'Use read-only API keys for safety. We never access your funds.'}
              </span>
            </div>
            
            {selectedMode === 'testnet' && (
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://testnet.binance.vision/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  Get Testnet Keys
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}

            <div className="grid gap-3">
              <div>
                <Label htmlFor="apiKey" className="text-sm">API Key</Label>
                <Input
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="apiSecret" className="text-sm">API Secret</Label>
                <Input
                  id="apiSecret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter your API secret"
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Allocation Suggestion */}
        {profile && selectedMode && (
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium">Suggested Allocation</span>
              <Badge variant="outline" className="text-xs capitalize">
                {profile.riskTolerance}
              </Badge>
            </div>
            <div className="flex gap-2">
              {allocation.map((item) => (
                <div 
                  key={item.asset}
                  className="flex-1 p-3 rounded-lg bg-background border border-border text-center"
                >
                  <div className="text-lg font-bold text-primary">{item.percentage}%</div>
                  <div className="text-xs text-muted-foreground">{item.asset}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connect Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={handleConnect}
          disabled={!selectedMode || isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              {selectedMode === 'demo' ? 'Start with Demo' : 'Connect Exchange'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
