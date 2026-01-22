import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Activity } from 'lucide-react';
import { TradeHistoryItem } from '@/hooks/useAITrading';

interface TradeHistoryProps {
  history: TradeHistoryItem[];
}

export const TradeHistory = ({ history }: TradeHistoryProps) => {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No order history</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your approved and rejected orders will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {history.slice().reverse().map(order => (
              <div key={order.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {order.status === 'approved' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {order.side.toUpperCase()} {order.symbol}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.executedAt.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono">{order.quantity.toFixed(6)}</p>
                  <p className="text-sm text-muted-foreground">@ ${order.price.toLocaleString()}</p>
                </div>
                <Badge variant={order.status === 'approved' ? 'default' : 'secondary'}>
                  {order.status}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
