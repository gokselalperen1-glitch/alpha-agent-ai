import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, ArrowRightLeft, RefreshCw, Zap, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { useArbitrage } from '@/hooks/useArbitrage';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ArbitrageDashboardProps {
  className?: string;
}

export const ArbitrageDashboard = ({ className }: ArbitrageDashboardProps) => {
  const {
    opportunities,
    isScanning,
    lastScanTime,
    bestOpportunity,
    scanForOpportunities,
    executeArbitrage,
    error,
  } = useArbitrage({ autoScan: true, scanInterval: 30000 });

  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executeQuantity, setExecuteQuantity] = useState<string>('');
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null);

  const handleExecute = async () => {
    if (!selectedOpportunity || !executeQuantity) return;

    setExecutingId(selectedOpportunity);
    try {
      await executeArbitrage(selectedOpportunity, parseFloat(executeQuantity));
      toast.success('Arbitrage executed successfully!');
      setSelectedOpportunity(null);
      setExecuteQuantity('');
    } catch (err) {
      toast.error('Failed to execute arbitrage');
    } finally {
      setExecutingId(null);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (remaining <= 0) return 'Expired';
    return `${Math.floor(remaining / 1000)}s`;
  };

  const activeOpportunities = opportunities.filter(
    o => o.status === 'active' && new Date(o.expires_at) > new Date()
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Opportunities</p>
                <p className="text-2xl font-bold">{activeOpportunities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Best Spread</p>
                <p className="text-2xl font-bold text-green-500">
                  {bestOpportunity ? `${bestOpportunity.spread_percent.toFixed(2)}%` : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <DollarSign className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Best Profit</p>
                <p className="text-2xl font-bold">
                  {bestOpportunity?.estimated_profit 
                    ? `$${bestOpportunity.estimated_profit.toFixed(2)}` 
                    : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <Clock className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Scan</p>
                <p className="text-lg font-medium">
                  {lastScanTime ? lastScanTime.toLocaleTimeString() : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Cross-Exchange Arbitrage
              </CardTitle>
              <CardDescription>
                Real-time price discrepancies across exchanges
              </CardDescription>
            </div>
            <Button
              onClick={() => scanForOpportunities()}
              disabled={isScanning}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isScanning && "animate-spin")} />
              {isScanning ? 'Scanning...' : 'Scan Now'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 text-destructive mb-4 p-3 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {activeOpportunities.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No arbitrage opportunities detected</p>
              <p className="text-sm mt-1">Opportunities are scanned every 30 seconds</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Buy Exchange</TableHead>
                  <TableHead>Sell Exchange</TableHead>
                  <TableHead className="text-right">Buy Price</TableHead>
                  <TableHead className="text-right">Sell Price</TableHead>
                  <TableHead className="text-right">Spread</TableHead>
                  <TableHead className="text-right">Est. Profit</TableHead>
                  <TableHead>Time Left</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeOpportunities.map((opp) => {
                  const timeRemaining = getTimeRemaining(opp.expires_at);
                  const isExpiringSoon = new Date(opp.expires_at).getTime() - Date.now() < 10000;

                  return (
                    <TableRow key={opp.id}>
                      <TableCell className="font-medium">{opp.symbol}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {opp.buy_exchange}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {opp.sell_exchange}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${opp.buy_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${opp.sell_price.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-bold",
                          opp.spread_percent >= 0.5 ? "text-green-500" : "text-amber-500"
                        )}>
                          {opp.spread_percent.toFixed(3)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-500">
                        ${(opp.estimated_profit || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className={cn(
                            "text-sm font-medium",
                            isExpiringSoon ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {timeRemaining}
                          </span>
                          <Progress 
                            value={Math.max(0, (new Date(opp.expires_at).getTime() - Date.now()) / 300)} 
                            className="h-1"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm"
                              onClick={() => setSelectedOpportunity(opp.id)}
                              disabled={executingId === opp.id || timeRemaining === 'Expired'}
                            >
                              {executingId === opp.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                'Execute'
                              )}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Execute Arbitrage</DialogTitle>
                              <DialogDescription>
                                Buy {opp.symbol} on {opp.buy_exchange} at ${opp.buy_price.toLocaleString()}, 
                                sell on {opp.sell_exchange} at ${opp.sell_price.toLocaleString()}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="p-4 bg-muted rounded-lg space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>Spread:</span>
                                  <span className="font-bold text-green-500">{opp.spread_percent.toFixed(3)}%</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Available Volume:</span>
                                  <span>{(opp.volume_available || 0).toFixed(4)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>Estimated Profit:</span>
                                  <span className="font-bold text-green-500">${(opp.estimated_profit || 0).toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="quantity">Quantity to Trade</Label>
                                <Input
                                  id="quantity"
                                  type="number"
                                  placeholder={`Max: ${(opp.volume_available || 0).toFixed(4)}`}
                                  value={executeQuantity}
                                  onChange={(e) => setExecuteQuantity(e.target.value)}
                                  max={opp.volume_available || 0}
                                />
                              </div>
                              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                  <div className="text-sm text-amber-700 dark:text-amber-300">
                                    <p className="font-medium">Risk Warning</p>
                                    <p>Arbitrage involves execution risk. Prices may change during execution, 
                                    potentially resulting in losses.</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setSelectedOpportunity(null)}>
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleExecute}
                                disabled={!executeQuantity || parseFloat(executeQuantity) <= 0}
                              >
                                Confirm Execution
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
