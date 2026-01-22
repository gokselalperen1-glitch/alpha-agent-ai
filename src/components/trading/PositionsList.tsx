import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { Position } from '@/hooks/useAITrading';

interface PositionsListProps {
  positions: Position[];
  lastPrice: number | null;
}

export const PositionsList = ({ positions, lastPrice }: PositionsListProps) => {
  if (positions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No open positions</p>
          <p className="text-sm text-muted-foreground mt-1">
            Approve a buy order to open a position
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {positions.map(position => {
        const currentPrice = lastPrice || position.avgPrice;
        const pnl = (currentPrice - position.avgPrice) * position.quantity;
        const pnlPercent = ((currentPrice / position.avgPrice) - 1) * 100;
        
        return (
          <Card key={position.symbol}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">{position.symbol}</p>
                  <p className="text-sm text-muted-foreground">
                    {position.quantity.toFixed(6)} @ ${position.avgPrice.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono">${(position.quantity * currentPrice).toLocaleString()}</p>
                  <p className={`text-sm font-mono ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
