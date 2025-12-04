import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useRealtimePrices } from '@/hooks/useRealtimePrices';
import { cn } from '@/lib/utils';

interface LivePriceTickerProps {
  symbols?: string[];
  exchange?: string;
  compact?: boolean;
}

export const LivePriceTicker = ({ 
  symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'], 
  exchange = 'binance',
  compact = false 
}: LivePriceTickerProps) => {
  const { prices, isConnected, error, connect, disconnect } = useRealtimePrices({
    symbols: symbols.map(s => s.toLowerCase()),
    exchange,
    enabled: true,
  });

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(6);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4 overflow-x-auto py-2">
        <div className="flex items-center gap-1 text-xs">
          {isConnected ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" />
          )}
          <span className="text-muted-foreground">Live</span>
        </div>
        {prices.map((price) => (
          <div key={`${price.exchange}:${price.symbol}`} className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-medium text-sm">{price.symbol}</span>
            <span className="text-sm">${formatPrice(price.price)}</span>
            {price.change24h !== undefined && (
              <span className={cn(
                "text-xs",
                price.change24h >= 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {price.change24h >= 0 ? '+' : ''}{price.change24h.toFixed(2)}%
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Live Prices
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'destructive'} className="gap-1">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Disconnected
                </>
              )}
            </Badge>
            {!isConnected && (
              <Button size="sm" variant="outline" onClick={connect}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconnect
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="text-sm text-red-500 mb-4">{error}</div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {prices.length === 0 ? (
            <div className="col-span-full text-center py-4 text-muted-foreground">
              {isConnected ? 'Waiting for price data...' : 'Connect to see live prices'}
            </div>
          ) : (
            prices.map((price) => (
              <div
                key={`${price.exchange}:${price.symbol}`}
                className="p-4 bg-muted/50 rounded-lg border"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">{price.symbol.replace('USDT', '')}</span>
                  {price.change24h !== undefined && (
                    price.change24h >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )
                  )}
                </div>
                <p className="text-2xl font-bold">${formatPrice(price.price)}</p>
                {price.change24h !== undefined && (
                  <p className={cn(
                    "text-sm mt-1",
                    price.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                  )}>
                    {price.change24h >= 0 ? '+' : ''}{price.change24h.toFixed(2)}% (24h)
                  </p>
                )}
                {price.volume24h !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Vol: {(price.volume24h / 1000000).toFixed(2)}M
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
