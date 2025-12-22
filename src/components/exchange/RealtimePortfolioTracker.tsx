import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Wallet, Wifi, WifiOff, Activity, RefreshCw, Zap } from 'lucide-react';
import { useRealtimePortfolio } from '@/hooks/useRealtimePortfolio';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface RealtimePortfolioTrackerProps {
  userId: string;
}

interface PriceFlash {
  symbol: string;
  direction: 'up' | 'down';
  timestamp: number;
}

export const RealtimePortfolioTracker = ({ userId }: RealtimePortfolioTrackerProps) => {
  const {
    realtimeValues,
    totalValue,
    totalPnL,
    totalPnLPercent,
    isConnected,
    loading,
    refresh,
  } = useRealtimePortfolio(userId);

  const [priceFlashes, setPriceFlashes] = useState<Map<string, PriceFlash>>(new Map());
  const [previousPrices, setPreviousPrices] = useState<Map<string, number>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Track price changes and add flash effects
  useEffect(() => {
    const newFlashes = new Map(priceFlashes);
    const now = Date.now();

    realtimeValues.forEach((item) => {
      const prevPrice = previousPrices.get(item.symbol);
      if (prevPrice !== undefined && prevPrice !== item.currentPrice) {
        newFlashes.set(item.symbol, {
          symbol: item.symbol,
          direction: item.currentPrice > prevPrice ? 'up' : 'down',
          timestamp: now,
        });
      }
    });

    // Update previous prices
    const newPrevPrices = new Map<string, number>();
    realtimeValues.forEach((item) => {
      newPrevPrices.set(item.symbol, item.currentPrice);
    });
    setPreviousPrices(newPrevPrices);
    setPriceFlashes(newFlashes);
    
    if (realtimeValues.length > 0) {
      setLastUpdate(new Date());
    }

    // Clear flashes after animation
    const timer = setTimeout(() => {
      const clearedFlashes = new Map(priceFlashes);
      clearedFlashes.forEach((flash, key) => {
        if (now - flash.timestamp > 500) {
          clearedFlashes.delete(key);
        }
      });
      setPriceFlashes(clearedFlashes);
    }, 600);

    return () => clearTimeout(timer);
  }, [realtimeValues]);

  const getFlashClass = (symbol: string) => {
    const flash = priceFlashes.get(symbol);
    if (!flash || Date.now() - flash.timestamp > 500) return '';
    return flash.direction === 'up' 
      ? 'animate-pulse bg-green-500/20' 
      : 'animate-pulse bg-red-500/20';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connection Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
            isConnected 
              ? "bg-green-500/20 text-green-500" 
              : "bg-red-500/20 text-red-500"
          )}>
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4" />
                <span>Live</span>
                <Zap className="h-3 w-3 animate-pulse" />
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4" />
                <span>Offline</span>
              </>
            )}
          </div>
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Updated: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-3xl font-bold tracking-tight">
                  ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {realtimeValues.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {realtimeValues.length} asset{realtimeValues.length !== 1 ? 's' : ''} tracked
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "overflow-hidden transition-colors duration-300",
          totalPnL >= 0 ? 'border-green-500/30' : 'border-red-500/30'
        )}>
          <div className={cn(
            "absolute inset-0 pointer-events-none",
            totalPnL >= 0 ? 'bg-gradient-to-br from-green-500/10 to-transparent' : 'bg-gradient-to-br from-red-500/10 to-transparent'
          )} />
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={cn(
                  "text-3xl font-bold tracking-tight",
                  totalPnL >= 0 ? 'text-green-500' : 'text-red-500'
                )}>
                  {totalPnL >= 0 ? '+' : ''}${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={cn(
                  "text-sm font-medium mt-1",
                  totalPnL >= 0 ? 'text-green-500/80' : 'text-red-500/80'
                )}>
                  {totalPnL >= 0 ? '↑ Profit' : '↓ Loss'}
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                totalPnL >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
              )}>
                {totalPnL >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-500" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className={cn(
            "absolute inset-0 pointer-events-none",
            totalPnLPercent >= 0 ? 'bg-gradient-to-br from-green-500/5 to-transparent' : 'bg-gradient-to-br from-red-500/5 to-transparent'
          )} />
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Return</p>
                <p className={cn(
                  "text-3xl font-bold tracking-tight",
                  totalPnLPercent >= 0 ? 'text-green-500' : 'text-red-500'
                )}>
                  {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Overall performance
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Holdings
                {isConnected && (
                  <Badge variant="outline" className="text-xs gap-1 font-normal">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Real-time
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Live portfolio values with real-time price updates</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {realtimeValues.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No holdings yet</h3>
              <p className="text-muted-foreground mb-4">Connect an exchange and sync your portfolio to see real-time values</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Avg Buy Price</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">Market Value</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead className="text-right">Return</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {realtimeValues.map((item) => (
                    <TableRow 
                      key={item.symbol}
                      className={cn("transition-colors duration-300", getFlashClass(item.symbol))}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs">
                            {item.symbol.substring(0, 2)}
                          </div>
                          <span className="font-semibold">{item.symbol}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.quantity.toFixed(item.quantity < 1 ? 6 : 4)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        ${item.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${item.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${item.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-mono font-medium",
                          item.pnl >= 0 ? 'text-green-500' : 'text-red-500'
                        )}>
                          {item.pnl >= 0 ? '+' : ''}${Math.abs(item.pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {item.pnlPercent >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <span className={cn(
                            "font-mono font-medium",
                            item.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'
                          )}>
                            {item.pnlPercent >= 0 ? '+' : ''}{item.pnlPercent.toFixed(2)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
