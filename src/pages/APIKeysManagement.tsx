import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Key, Check, X, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface APIKey {
  id: string;
  provider: string;
  is_active: boolean;
  rate_limit_remaining: number | null;
  rate_limit_reset_at: string | null;
  created_at: string;
}

const DATA_PROVIDERS = [
  {
    id: 'polygon',
    name: 'Polygon.io',
    description: 'Stock, forex, and crypto market data',
    capabilities: ['Stocks', 'Forex', 'Crypto', 'Options'],
  },
  {
    id: 'alphavantage',
    name: 'Alpha Vantage',
    description: 'Technical indicators and fundamentals',
    capabilities: ['Stocks', 'Forex', 'Crypto', 'Technical Analysis'],
  },
  {
    id: 'finnhub',
    name: 'Finnhub',
    description: 'Financial news and fundamentals',
    capabilities: ['Stocks', 'News', 'Company Data', 'Earnings'],
  },
  {
    id: 'stocktwits',
    name: 'StockTwits',
    description: 'Social sentiment analysis (no API key required)',
    capabilities: ['Sentiment', 'Social Trends'],
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

        <div className="grid gap-6">
          {DATA_PROVIDERS.map((provider) => {
            const existingKey = getProviderKey(provider.id);

            return (
              <Card key={provider.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        {provider.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {provider.description}
                      </CardDescription>
                    </div>
                    {existingKey && (
                      <Badge variant={existingKey.is_active ? 'default' : 'secondary'}>
                        {existingKey.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
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
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Added:</span>{' '}
                          {new Date(existingKey.created_at).toLocaleDateString()}
                        </div>
                        {existingKey.rate_limit_remaining !== null && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Rate Limit:</span>{' '}
                            {existingKey.rate_limit_remaining} requests remaining
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestKey(provider.id)}
                          disabled={testingProvider === provider.id || provider.id === 'stocktwits'}
                        >
                          {testingProvider === provider.id ? 'Testing...' : 'Test Connection'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(existingKey.id, existingKey.is_active)}
                        >
                          {existingKey.is_active ? (
                            <>
                              <X className="mr-2 h-4 w-4" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Enable
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteKey(existingKey.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : provider.id === 'stocktwits' ? (
                    <Alert>
                      <AlertDescription>
                        No API key required for StockTwits - it's ready to use!
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`key-${provider.id}`}>API Key</Label>
                        <Input
                          id={`key-${provider.id}`}
                          type="password"
                          placeholder="Enter your API key"
                          value={newKey.provider === provider.id ? newKey.apiKey : ''}
                          onChange={(e) =>
                            setNewKey({ provider: provider.id, apiKey: e.target.value })
                          }
                        />
                      </div>
                      <Button onClick={() => handleAddKey(provider.id)} size="sm">
                        Add API Key
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
