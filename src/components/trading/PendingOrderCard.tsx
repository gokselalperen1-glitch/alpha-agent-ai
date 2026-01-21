import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, TrendingUp, TrendingDown, Clock, Brain } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface PendingOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  confidence: number;
  reasoning: string;
  indicators: {
    rsi: number;
    macd: string;
    trend: string;
  };
  riskScore: number;
  createdAt: Date;
  expiresAt: Date;
}

interface PendingOrderCardProps {
  order: PendingOrder;
  onApprove: (order: PendingOrder) => void;
  onReject: (order: PendingOrder) => void;
  isProcessing?: boolean;
}

export const PendingOrderCard = ({ order, onApprove, onReject, isProcessing }: PendingOrderCardProps) => {
  const isBuy = order.side === 'buy';
  const estimatedValue = order.quantity * order.price;
  const timeLeft = formatDistanceToNow(order.expiresAt, { addSuffix: true });
  const isExpiring = new Date() > new Date(order.expiresAt.getTime() - 60000); // < 1 min left

  return (
    <Card className={`border-2 ${isBuy ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isBuy ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <span className="font-bold text-lg">{order.symbol}</span>
            <Badge variant={isBuy ? 'default' : 'destructive'} className="uppercase">
              {order.side}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Brain className="h-3 w-3" />
              {(order.confidence * 100).toFixed(0)}% confident
            </Badge>
            <Badge variant={isExpiring ? 'destructive' : 'secondary'} className="gap-1">
              <Clock className="h-3 w-3" />
              {timeLeft}
            </Badge>
          </div>
        </div>

        {/* Trade Details */}
        <div className="grid grid-cols-3 gap-4 py-2 border-y border-border">
          <div>
            <p className="text-xs text-muted-foreground">Quantity</p>
            <p className="font-mono font-semibold">{order.quantity.toFixed(6)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="font-mono font-semibold">${order.price.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Est. Value</p>
            <p className="font-mono font-semibold">${estimatedValue.toLocaleString()}</p>
          </div>
        </div>

        {/* AI Reasoning */}
        <div className="bg-muted/50 p-3 rounded-lg space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Analysis
          </p>
          <p className="text-sm text-muted-foreground">{order.reasoning}</p>
          <div className="flex gap-4 text-xs">
            <span>RSI: <span className="font-mono">{order.indicators.rsi.toFixed(0)}</span></span>
            <span>MACD: <span className="font-mono">{order.indicators.macd}</span></span>
            <span>Trend: <span className="font-mono">{order.indicators.trend}</span></span>
            <span>Risk: <span className={`font-mono ${order.riskScore > 60 ? 'text-red-500' : order.riskScore > 30 ? 'text-yellow-500' : 'text-green-500'}`}>
              {order.riskScore}/100
            </span></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 gap-2" 
            onClick={() => onReject(order)}
            disabled={isProcessing}
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
          <Button 
            className={`flex-1 gap-2 ${isBuy ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            onClick={() => onApprove(order)}
            disabled={isProcessing}
          >
            <Check className="h-4 w-4" />
            Approve {order.side.toUpperCase()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
