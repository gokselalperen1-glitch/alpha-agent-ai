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
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ExchangeConnection {
  id: string;
  exchange_name: string;
  is_active: boolean;
  created_at: string;
}

const SUPPORTED_EXCHANGES = [
  { value: 'binance', label: 'Binance' },
  { value: 'coinbase', label: 'Coinbase' },
  { value: 'kraken', label: 'Kraken' },
  { value: 'bybit', label: 'Bybit' },
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
  });

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
        description: 'Please fill in all fields',
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
        },
      });

      if (error || !data.success) {
        throw new Error(data?.error || 'Connection test failed');
      }

      toast({
        title: 'Connection Successful',
        description: `Found ${data.data.availableMarkets.length} markets`,
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
        },
      });

      if (error || !data.success) {
        throw new Error(data?.error || 'Failed to save connection');
      }

      toast({
        title: 'Connection Saved',
        description: 'Exchange connection added successfully',
      });

      setIsDialogOpen(false);
      setFormData({ exchangeName: '', apiKey: '', apiSecret: '' });
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Exchange</DialogTitle>
                <DialogDescription>
                  Add your exchange API credentials. Your keys are encrypted and stored securely.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="exchange">Exchange</Label>
                  <Select value={formData.exchangeName} onValueChange={(value) => setFormData({ ...formData, exchangeName: value })}>
                    <SelectTrigger id="exchange">
                      <SelectValue placeholder="Select exchange" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_EXCHANGES.map(ex => (
                        <SelectItem key={ex.value} value={ex.value}>{ex.label}</SelectItem>
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
                    {connection.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    Connected on {new Date(connection.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
