import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, CheckCircle, XCircle, AlertTriangle, Clock, Key } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ExchangeConnection {
  id: string;
  exchange_name: string;
  is_active: boolean;
  is_testnet: boolean;
  health_status: string;
  last_health_check: string | null;
  permissions: {
    read: boolean;
    trade: boolean;
    withdraw: boolean;
  };
  created_at: string;
}

const SUPPORTED_EXCHANGES = [
  { value: 'binance', label: 'Binance', requiresPassphrase: false },
  { value: 'coinbase', label: 'Coinbase', requiresPassphrase: true },
  { value: 'kraken', label: 'Kraken', requiresPassphrase: false },
  { value: 'bybit', label: 'Bybit', requiresPassphrase: false },
  { value: 'kucoin', label: 'KuCoin', requiresPassphrase: true },
  { value: 'okx', label: 'OKX', requiresPassphrase: true },
];

const ExchangeConnections = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    exchangeName: '',
    apiKey: '',
    apiSecret: '',
    passphrase: '',
    isTestnet: false,
  });

  const selectedExchange = SUPPORTED_EXCHANGES.find(ex => ex.value === formData.exchangeName);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadConnections();
      }
      setLoading(false);
    });
  }, [navigate]);

  const loadConnections = async () => {
    const { data, error } = await supabase.functions.invoke('manage-exchange-connection', {
      body: { action: 'list' },
    });

    if (error) {
      console.error('Failed to load connections:', error);
      return;
    }

    if (data.success) {
      setConnections(data.connections);
    }
  };

  const handleTest = async () => {
    if (!formData.exchangeName || !formData.apiKey || !formData.apiSecret) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (selectedExchange?.requiresPassphrase && !formData.passphrase) {
      toast({
        title: 'Passphrase Required',
        description: `${selectedExchange.label} requires a passphrase`,
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-exchange-connection', {
        body: {
          action: 'test',
          exchangeName: formData.exchangeName,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
          passphrase: formData.passphrase || undefined,
          isTestnet: formData.isTestnet,
        },
      });

      if (error || !data.success) {
        throw new Error(data?.error || 'Connection test failed');
      }

      const permissions = data.data.permissions;
      const permissionText = permissions.trade 
        ? 'with trading permissions' 
        : 'with read-only permissions';

      toast({
        title: 'Connection Successful',
        description: `Found ${data.data.availableMarkets.length} markets ${permissionText}`,
      });
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-exchange-connection', {
        body: {
          action: 'save',
          exchangeName: formData.exchangeName,
          apiKey: formData.apiKey,
          apiSecret: formData.apiSecret,
          passphrase: formData.passphrase || undefined,
          isTestnet: formData.isTestnet,
        },
      });

      if (error || !data.success) {
        throw new Error(data?.error || 'Failed to save connection');
      }

      const permissionText = data.permissions?.trade 
        ? 'with trading enabled' 
        : 'with read-only access';

      toast({
        title: 'Connection Saved',
        description: `${formData.exchangeName} connected ${permissionText}`,
      });

      // Auto-sync portfolio after saving connection
      try {
        await supabase.functions.invoke('sync-portfolio', {
          body: { connectionId: data.connection.id },
        });
        toast({
          title: 'Portfolio Synced',
          description: 'Your portfolio has been synced from the exchange',
        });
      } catch (syncError) {
        console.error('Portfolio sync failed:', syncError);
      }

      setIsDialogOpen(false);
      setFormData({ exchangeName: '', apiKey: '', apiSecret: '', passphrase: '', isTestnet: false });
      loadConnections();
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    try {
      const { data, error } = await supabase.functions.invoke('manage-exchange-connection', {
        body: {
          action: 'delete',
          connectionId,
        },
      });

      if (error || !data.success) {
        throw new Error('Failed to delete connection');
      }

      toast({
        title: 'Connection Deleted',
        description: 'Exchange connection removed',
      });

      loadConnections();
    } catch (error: any) {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'auth_failed':
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'rate_limited':
      case 'network_error':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'auth_failed':
        return 'Auth Failed';
      case 'rate_limited':
        return 'Rate Limited';
      case 'network_error':
        return 'Network Error';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={user} />
      <main className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Exchange Connections</h1>
            <p className="text-muted-foreground mt-2">Connect your cryptocurrency exchange accounts for live trading</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/api-keys')}>
              <Key className="mr-2 h-4 w-4" />
              Manage API Keys
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Connection
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Connect Exchange</DialogTitle>
                  <DialogDescription>
                    Add your exchange API credentials. Your keys are encrypted and stored securely.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="exchange">Exchange</Label>
                    <Select 
                      value={formData.exchangeName} 
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        exchangeName: value,
                        passphrase: '' // Reset passphrase when changing exchange
                      })}
                    >
                      <SelectTrigger id="exchange">
                        <SelectValue placeholder="Select exchange" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_EXCHANGES.map(ex => (
                          <SelectItem key={ex.value} value={ex.value}>
                            {ex.label}
                            {ex.requiresPassphrase && <span className="text-xs text-muted-foreground ml-2">(requires passphrase)</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="Enter API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiSecret">API Secret</Label>
                    <Input
                      id="apiSecret"
                      type="password"
                      value={formData.apiSecret}
                      onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                      placeholder="Enter API secret"
                    />
                  </div>
                  {selectedExchange?.requiresPassphrase && (
                    <div className="space-y-2">
                      <Label htmlFor="passphrase">Passphrase</Label>
                      <Input
                        id="passphrase"
                        type="password"
                        value={formData.passphrase}
                        onChange={(e) => setFormData({ ...formData, passphrase: e.target.value })}
                        placeholder="Enter passphrase"
                      />
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="testnet"
                      checked={formData.isTestnet}
                      onCheckedChange={(checked) => setFormData({ ...formData, isTestnet: checked })}
                    />
                    <Label htmlFor="testnet">Use Testnet (recommended for testing)</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleTest} disabled={isTesting} variant="outline" className="flex-1">
                      {isTesting ? 'Testing...' : 'Test Connection'}
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                      {isSaving ? 'Saving...' : 'Save Connection'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {connections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No exchange connections yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Connection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((connection) => (
              <Card key={connection.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{connection.exchange_name}</span>
                    {getHealthStatusIcon(connection.health_status)}
                  </CardTitle>
                  <CardDescription>
                    Connected on {new Date(connection.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {connection.is_testnet && (
                      <Badge variant="outline">Testnet</Badge>
                    )}
                    <Badge variant={connection.health_status === 'healthy' ? 'default' : 'destructive'}>
                      {getHealthStatusText(connection.health_status)}
                    </Badge>
                    {connection.permissions.trade ? (
                      <Badge variant="default">Trading Enabled</Badge>
                    ) : (
                      <Badge variant="secondary">Read Only</Badge>
                    )}
                  </div>
                  {connection.last_health_check && (
                    <p className="text-xs text-muted-foreground">
                      Last checked: {new Date(connection.last_health_check).toLocaleString()}
                    </p>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(connection.id)}
                    className="w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ExchangeConnections;
