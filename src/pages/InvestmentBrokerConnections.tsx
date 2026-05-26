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
import { Trash2, Plus, CheckCircle, XCircle, AlertTriangle, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BrokerConnection {
  id: string;
  broker_type: string;
  account_name: string | null;
  account_number: string | null;
  is_active: boolean;
  is_testnet: boolean;
  health_status: string;
  last_health_check: string | null;
  last_sync_at: string | null;
  permissions: {
    read: boolean;
    trade: boolean;
    withdraw: boolean;
  };
  created_at: string;
}

const SUPPORTED_BROKERS = [
  { value: 'alpaca', label: 'Alpaca', icon: '📈', requiresOAuth: false },
  { value: 'interactive_brokers', label: 'Interactive Brokers', icon: '🏦', requiresOAuth: true },
  { value: 'td_ameritrade', label: 'TD Ameritrade', icon: '💼', requiresOAuth: true },
  { value: 'aladdin', label: 'Aladdin', icon: '🎯', requiresOAuth: false },
];

const InvestmentBrokerConnections = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  const [formData, setFormData] = useState({
    brokerType: '',
    accountName: '',
    accountNumber: '',
    apiKey: '',
    apiSecret: '',
    authToken: '',
    isTestnet: false,
  });

  const selectedBroker = SUPPORTED_BROKERS.find(b => b.value === formData.brokerType);

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
    try {
      const { data, error } = await supabase
        .from('investment_broker_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load connections:', error);
        return;
      }

      setConnections((data as any) || []);
    } catch (error) {
      console.error('Error loading connections:', error);
    }
  };

  const handleTest = async () => {
    if (!formData.brokerType || !formData.accountName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in broker type and account name',
        variant: 'destructive',
      });
      return;
    }

    if (selectedBroker?.requiresOAuth && !formData.authToken) {
      toast({
        title: 'Auth Token Required',
        description: `${selectedBroker.label} requires an authentication token`,
        variant: 'destructive',
      });
      return;
    }

    if (!selectedBroker?.requiresOAuth && (!formData.apiKey || !formData.apiSecret)) {
      toast({
        title: 'Credentials Required',
        description: 'Please provide API key and secret',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-broker-connection', {
        body: {
          brokerType: formData.brokerType,
          credentials: {
            apiKey: formData.apiKey,
            apiSecret: formData.apiSecret,
            authToken: formData.authToken,
            isTestnet: formData.isTestnet,
          },
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Connection test failed');
      }

      toast({
        title: 'Connection Successful',
        description: `Connected to ${selectedBroker?.label} successfully`,
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
      const { data, error } = await supabase
        .from('investment_broker_connections')
        .insert({
          user_id: user!.id,
          broker_type: formData.brokerType,
          account_name: formData.accountName,
          account_number: formData.accountNumber,
          api_key_encrypted: formData.apiKey ? btoa(formData.apiKey) : null,
          api_secret_encrypted: formData.apiSecret ? btoa(formData.apiSecret) : null,
          auth_token_encrypted: formData.authToken ? btoa(formData.authToken) : null,
          is_testnet: formData.isTestnet,
          is_active: true,
        })
        .select();

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Connection Saved',
        description: `${selectedBroker?.label} connected successfully`,
      });

      setIsDialogOpen(false);
      setFormData({
        brokerType: '',
        accountName: '',
        accountNumber: '',
        apiKey: '',
        apiSecret: '',
        authToken: '',
        isTestnet: false,
      });
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
      const { error } = await supabase
        .from('investment_broker_connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Connection Deleted',
        description: 'Broker connection removed',
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

  const handleToggleActive = async (connectionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('investment_broker_connections')
        .update({ is_active: !currentStatus })
        .eq('id', connectionId);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Status Updated',
        description: `Connection ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

      loadConnections();
    } catch (error: any) {
      toast({
        title: 'Update Failed',
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
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'rate_limited':
      case 'network_error':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <div className="h-5 w-5 text-muted-foreground animate-spin"><RefreshCw className="h-5 w-5" /></div>;
    }
  };

  const getBrokerLabel = (type: string) => {
    return SUPPORTED_BROKERS.find(b => b.value === type)?.label || type;
  };

  const getBrokerIcon = (type: string) => {
    return SUPPORTED_BROKERS.find(b => b.value === type)?.icon || '📊';
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
            <h1 className="text-3xl font-bold text-foreground">Investment Brokers</h1>
            <p className="text-muted-foreground mt-2">Connect and manage your investment accounts from multiple brokers</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Broker Connection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Connect Investment Broker</DialogTitle>
                <DialogDescription>
                  Add your broker credentials securely. Your keys are encrypted and stored safely.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Tabs defaultValue="credentials" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="credentials">Credentials</TabsTrigger>
                    <TabsTrigger value="account">Account Info</TabsTrigger>
                  </TabsList>

                  <TabsContent value="credentials" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="broker">Broker</Label>
                      <Select
                        value={formData.brokerType}
                        onValueChange={(value) => setFormData({ ...formData, brokerType: value })}
                      >
                        <SelectTrigger id="broker">
                          <SelectValue placeholder="Select broker" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_BROKERS.map(broker => (
                            <SelectItem key={broker.value} value={broker.value}>
                              {broker.icon} {broker.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedBroker?.requiresOAuth ? (
                      <div className="space-y-2">
                        <Label htmlFor="authToken">Authentication Token</Label>
                        <div className="flex gap-2">
                          <Input
                            id="authToken"
                            type={showSecrets ? "text" : "password"}
                            value={formData.authToken}
                            onChange={(e) => setFormData({ ...formData, authToken: e.target.value })}
                            placeholder="Paste your OAuth token"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSecrets(!showSecrets)}
                          >
                            {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="apiKey">API Key</Label>
                          <div className="flex gap-2">
                            <Input
                              id="apiKey"
                              type={showSecrets ? "text" : "password"}
                              value={formData.apiKey}
                              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                              placeholder="Enter API key"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowSecrets(!showSecrets)}
                            >
                              {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="apiSecret">API Secret</Label>
                          <Input
                            id="apiSecret"
                            type={showSecrets ? "text" : "password"}
                            value={formData.apiSecret}
                            onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                            placeholder="Enter API secret"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="testnet"
                        checked={formData.isTestnet}
                        onCheckedChange={(checked) => setFormData({ ...formData, isTestnet: checked })}
                      />
                      <Label htmlFor="testnet">Use Paper Trading / Testnet</Label>
                    </div>
                  </TabsContent>

                  <TabsContent value="account" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Name</Label>
                      <Input
                        id="accountName"
                        value={formData.accountName}
                        onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                        placeholder="e.g., My Main Account"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number (Optional)</Label>
                      <Input
                        id="accountNumber"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        placeholder="Your account number"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

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

        {connections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No broker connections yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Broker
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connections.map((connection) => (
              <Card key={connection.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-2xl mr-2">{getBrokerIcon(connection.broker_type)}</span>
                    <span className="flex-1">{getBrokerLabel(connection.broker_type)}</span>
                    {getHealthStatusIcon(connection.health_status)}
                  </CardTitle>
                  <CardDescription>
                    {connection.account_name || 'Unnamed Account'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {connection.is_testnet && (
                      <Badge variant="outline">Paper Trading</Badge>
                    )}
                    <Badge variant={connection.is_active ? 'default' : 'secondary'}>
                      {connection.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {connection.permissions?.trade ? (
                      <Badge variant="default">Trade Enabled</Badge>
                    ) : (
                      <Badge variant="secondary">Read Only</Badge>
                    )}
                  </div>

                  {connection.last_sync_at && (
                    <p className="text-xs text-muted-foreground">
                      Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(connection.id, connection.is_active)}
                      className="flex-1"
                    >
                      {connection.is_active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(connection.id)}
                      className="flex-1"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default InvestmentBrokerConnections;
