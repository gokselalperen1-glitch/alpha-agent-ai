import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Key, Check, X, AlertCircle, Brain, Database, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface APIKey {
  id: string;
  provider: string;
  is_active: boolean;
  rate_limit_remaining: number | null;
  rate_limit_reset_at: string | null;
  created_at: string;
}

const DATA_PROVIDERS = [
  // Investment AI Systems
  {
    id: 'aladdin',
    name: 'BlackRock Aladdin',
    description: 'Enterprise risk analytics and portfolio management',
    capabilities: ['Risk Analysis', 'Portfolio Optimization', 'Asset Allocation', 'Stress Testing'],
    category: 'ai',
  },
  {
    id: 'bloomberg_terminal',
    name: 'Bloomberg Terminal API',
    description: 'Real-time market data and analytics',
    capabilities: ['Market Data', 'News', 'Analytics', 'Trading'],
    category: 'ai',
  },
  {
    id: 'refinitiv',
    name: 'Refinitiv Eikon',
    description: 'Financial analysis and trading tools',
    capabilities: ['Market Data', 'News', 'Fundamentals', 'ESG'],
    category: 'ai',
  },
  {
    id: 'kensho',
    name: 'S&P Kensho',
    description: 'AI-powered market intelligence',
    capabilities: ['AI Analysis', 'Event Detection', 'Pattern Recognition'],
    category: 'ai',
  },
  {
    id: 'symphony_ayasdi',
    name: 'Symphony AyasdiAI',
    description: 'Machine learning for financial services',
    capabilities: ['ML Models', 'Risk Detection', 'Compliance'],
    category: 'ai',
  },
  // Market Data Providers
  {
    id: 'polygon',
    name: 'Polygon.io',
    description: 'Stock, forex, and crypto market data',
    capabilities: ['Stocks', 'Forex', 'Crypto', 'Options'],
    category: 'data',
  },
  {
    id: 'alphavantage',
    name: 'Alpha Vantage',
    description: 'Technical indicators and fundamentals',
    capabilities: ['Stocks', 'Forex', 'Crypto', 'Technical Analysis'],
    category: 'data',
  },
  {
    id: 'finnhub',
    name: 'Finnhub',
    description: 'Financial news and fundamentals',
    capabilities: ['Stocks', 'News', 'Company Data', 'Earnings'],
    category: 'data',
  },
  {
    id: 'stocktwits',
    name: 'StockTwits',
    description: 'Social sentiment analysis (no API key required)',
    capabilities: ['Sentiment', 'Social Trends'],
    category: 'data',
    noKeyRequired: true,
  },
];

export default function APIKeysManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [newKey, setNewKey] = useState({ provider: '', apiKey: '' });
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        loadAPIKeys();
      }
    });
  }, [navigate]);

  const loadAPIKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_provider_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAPIKeys(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async (providerId: string) => {
    if (!newKey.apiKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an API key',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('api_provider_keys')
        .insert([{
          user_id: user.id,
          provider: providerId,
          api_key_encrypted: newKey.apiKey,
          is_active: true,
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${providerId} API key added successfully`,
      });

      setNewKey({ provider: '', apiKey: '' });
      loadAPIKeys();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleTestKey = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      // Test by calling api-connector
      const { data, error } = await supabase.functions.invoke('api-connector', {
        body: {
          provider: providerId,
          action: 'quote',
          symbol: 'AAPL',
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${providerId} API key is working correctly`,
      });
    } catch (error: any) {
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setTestingProvider(null);
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('api_provider_keys')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `API key ${!isActive ? 'enabled' : 'disabled'}`,
      });

      loadAPIKeys();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const { error } = await supabase
        .from('api_provider_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'API key deleted successfully',
      });

      loadAPIKeys();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getProviderKey = (providerId: string) => {
    return apiKeys.find((key) => key.provider === providerId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const ProviderCard = ({ 
    provider, 
    existingKey, 
    newKey, 
    setNewKey, 
    testingProvider, 
    onAddKey, 
    onTestKey, 
    onToggleActive, 
    onDeleteKey 
  }: {
    provider: typeof DATA_PROVIDERS[0];
    existingKey: APIKey | undefined;
    newKey: { provider: string; apiKey: string };
    setNewKey: (key: { provider: string; apiKey: string }) => void;
    testingProvider: string | null;
    onAddKey: (id: string) => void;
    onTestKey: (id: string) => void;
    onToggleActive: (id: string, isActive: boolean) => void;
    onDeleteKey: (id: string) => void;
  }) => (
    <Card className={existingKey?.is_active ? 'border-primary/30' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {provider.category === 'ai' ? (
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-muted">
                <Database className="h-5 w-5" />
              </div>
            )}
            <div>
              <CardTitle className="text-base">{provider.name}</CardTitle>
              <CardDescription className="text-sm">{provider.description}</CardDescription>
            </div>
          </div>
          {existingKey && (
            <Badge variant={existingKey.is_active ? 'default' : 'secondary'}>
              {existingKey.is_active ? 'Active' : 'Inactive'}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {provider.capabilities.map((capability) => (
            <Badge key={capability} variant="outline" className="text-xs">
              {capability}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {existingKey ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Added: {new Date(existingKey.created_at).toLocaleDateString()}
              </span>
              {existingKey.rate_limit_remaining !== null && (
                <span className="text-muted-foreground">
                  {existingKey.rate_limit_remaining} requests remaining
                </span>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTestKey(provider.id)}
                disabled={testingProvider === provider.id || provider.noKeyRequired}
              >
                {testingProvider === provider.id ? 'Testing...' : 'Test'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleActive(existingKey.id, existingKey.is_active)}
              >
                {existingKey.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDeleteKey(existingKey.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : provider.noKeyRequired ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-500" />
            Ready to use - no API key required
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter your API key"
              value={newKey.provider === provider.id ? newKey.apiKey : ''}
              onChange={(e) => setNewKey({ provider: provider.id, apiKey: e.target.value })}
              className="flex-1"
            />
            <Button onClick={() => onAddKey(provider.id)} size="sm">
              <Zap className="h-4 w-4 mr-1" />
              Activate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">API Keys Management</h1>
          <p className="text-muted-foreground">
            Manage your data provider API keys for market data and analysis
          </p>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            API keys are encrypted and stored securely. They will be used by your agents to fetch market data.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="ai" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Investment AI Systems
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Market Data Providers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4">
            <Alert className="border-primary/30 bg-primary/5">
              <Zap className="h-4 w-4" />
              <AlertDescription>
                Connect your enterprise AI platforms for advanced portfolio analytics and risk management.
                Your API keys are encrypted and only activated when you add them.
              </AlertDescription>
            </Alert>
            <div className="grid gap-4">
              {DATA_PROVIDERS.filter(p => p.category === 'ai').map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  existingKey={getProviderKey(provider.id)}
                  newKey={newKey}
                  setNewKey={setNewKey}
                  testingProvider={testingProvider}
                  onAddKey={handleAddKey}
                  onTestKey={handleTestKey}
                  onToggleActive={handleToggleActive}
                  onDeleteKey={handleDeleteKey}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <div className="grid gap-4">
              {DATA_PROVIDERS.filter(p => p.category === 'data').map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  existingKey={getProviderKey(provider.id)}
                  newKey={newKey}
                  setNewKey={setNewKey}
                  testingProvider={testingProvider}
                  onAddKey={handleAddKey}
                  onTestKey={handleTestKey}
                  onToggleActive={handleToggleActive}
                  onDeleteKey={handleDeleteKey}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
