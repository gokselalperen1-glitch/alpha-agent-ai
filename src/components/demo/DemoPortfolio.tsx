import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DemoTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  price: number;
  quantity: number;
  timestamp: Date;
  pnl?: number;
}

export interface DemoPosition {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
}

interface DemoPortfolioProps {
  startingBalance: number;
  currentBalance: number;
  positions: DemoPosition[];
  trades: DemoTrade[];
  className?: string;
}

export const DemoPortfolio = ({
  startingBalance,
  currentBalance,
  positions,
  trades,
  className
}: DemoPortfolioProps) => {
  const totalReturn = ((currentBalance - startingBalance) / startingBalance) * 100;
  const winningTrades = trades.filter(t => (t.pnl || 0) > 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Portfolio Value</p>
          <p className="text-lg font-bold">${currentBalance.toLocaleString()}</p>
          <div className={cn(
            "flex items-center gap-1 text-xs",
            totalReturn > 0 ? "text-green-500" : totalReturn < 0 ? "text-red-500" : "text-muted-foreground"
          )}>
            {totalReturn > 0 ? <TrendingUp className="h-3 w-3" /> : 
             totalReturn < 0 ? <TrendingDown className="h-3 w-3" /> : 
             <Minus className="h-3 w-3" />}
            {totalReturn > 0 ? '+' : ''}{totalReturn.toFixed(2)}%
          </div>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Win Rate</p>
          <p className="text-lg font-bold">{winRate.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground">
            {winningTrades}/{trades.length} trades
          </p>
        </div>
      </div>
      
      {/* Positions */}
      {positions.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Open Positions</h4>
          <div className="space-y-2">
            {positions.map(pos => (
              <div key={pos.symbol} className="flex items-center justify-between bg-muted/30 rounded px-3 py-2">
                <div>
                  <span className="font-medium text-sm">{pos.quantity.toFixed(4)} {pos.symbol}</span>
                  <p className="text-xs text-muted-foreground">@ ${pos.avgPrice.toLocaleString()}</p>
                </div>
                <div className={cn(
                  "text-right text-sm font-medium",
                  pos.unrealizedPnl > 0 ? "text-green-500" : pos.unrealizedPnl < 0 ? "text-red-500" : ""
                )}>
                  {pos.unrealizedPnl > 0 ? '+' : ''}${pos.unrealizedPnl.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Recent Trades */}
      {trades.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Recent Trades</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {trades.slice(-5).reverse().map(trade => (
              <div key={trade.id} className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    trade.side === 'buy' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                  )}>
                    {trade.side.toUpperCase()}
                  </span>
                  <span>{trade.quantity.toFixed(4)} {trade.symbol}</span>
                </div>
                <span className="text-muted-foreground">
                  ${trade.price.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
