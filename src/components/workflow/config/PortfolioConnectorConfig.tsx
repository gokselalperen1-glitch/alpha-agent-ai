import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Link2, CheckCircle, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ExchangeConnection {
  id: string;
  exchange_name: string;
  is_testnet: boolean;
  health_status: string;
  permissions: { read: boolean; trade: boolean; withdraw: boolean };
}

interface PortfolioConnectorConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const PortfolioConnectorConfig = ({ config, onChange }: PortfolioConnectorConfigProps) => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-exchange-connection', {
        body: { action: 'list' },
      });

      if (!error && data?.success) {
        setConnections(data.connections || []);
        
        // Auto-select first connection if none selected
        if (!config.connectionId && data.connections?.length > 0) {
          onChange({ ...config, connectionId: data.connections[0].id });
        }
      }
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!config.connectionId) return;
    
    setSyncing(true);
    try {
      await supabase.functions.invoke('sync-portfolio', {
        body: { connectionId: config.connectionId },
      });
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const selectedConnection = connections.find(c => c.id === config.connectionId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {connections.length === 0 ? (
        <div className="text-center py-6 space-y-3">
          <Link2 className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No exchange connections found</p>
          <Button onClick={() => navigate('/exchange-connections')} size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            Connect Exchange
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Exchange Connection</Label>
            <Select
              value={config.connectionId || ''}
              onValueChange={(value) => onChange({ ...config, connectionId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select exchange" />
              </SelectTrigger>
              <SelectContent>
                {connections.map(conn => (
                  <SelectItem key={conn.id} value={conn.id}>
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{conn.exchange_name}</span>
                      {conn.is_testnet && (
                        <Badge variant="outline" className="text-xs">Testnet</Badge>
                      )}
                      {conn.permissions.trade ? (
                        <Badge className="text-xs bg-green-500">Trading</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Read-only</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedConnection && (
            <div className="p-3 rounded-lg border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{selectedConnection.exchange_name}</span>
                {selectedConnection.health_status === 'healthy' ? (
                  <div className="flex items-center gap-1 text-green-500">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs">{selectedConnection.health_status}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="flex-1">
                  <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Portfolio'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigate('/exchange-connections')}>
                  Manage
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Data to Fetch</Label>
            <Select
              value={config.dataType || 'balances'}
              onValueChange={(value) => onChange({ ...config, dataType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balances">Portfolio Balances</SelectItem>
                <SelectItem value="positions">Open Positions</SelectItem>
                <SelectItem value="orders">Active Orders</SelectItem>
                <SelectItem value="trades">Recent Trades</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Update Frequency</Label>
            <Select
              value={config.updateFrequency || 'on-trigger'}
              onValueChange={(value) => onChange({ ...config, updateFrequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="on-trigger">On Workflow Trigger</SelectItem>
                <SelectItem value="realtime">Real-time (WebSocket)</SelectItem>
                <SelectItem value="30s">Every 30 seconds</SelectItem>
                <SelectItem value="1m">Every minute</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
};
