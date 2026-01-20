import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, X, Clock, CheckCircle2, XCircle, ListOrdered } from 'lucide-react';
import { useOrders } from '@/hooks/useOrders';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OrderManagerProps {
  className?: string;
}

export const OrderManager = ({ className }: OrderManagerProps) => {
  const {
    orders,
    openOrders,
    filledOrders,
    isLoading,
    error,
    totalFees,
    cancelOrder,
  } = useOrders({ limit: 50 });

  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingOrder(orderId);
    try {
      await cancelOrder(orderId);
      toast.success('Order cancelled');
    } catch (err) {
      toast.error('Failed to cancel order');
    } finally {
      setCancellingOrder(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'filled':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Filled</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-500 border-amber-500">Pending</Badge>;
      case 'open':
        return <Badge variant="outline">Open</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="text-muted-foreground">Cancelled</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'partial':
        return <Badge className="bg-blue-500/10 text-blue-500">Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOrderTypeBadge = (orderType: string) => {
    switch (orderType) {
      case 'market':
        return <Badge variant="secondary">Market</Badge>;
      case 'limit':
        return <Badge variant="outline">Limit</Badge>;
      case 'stop_limit':
        return <Badge variant="outline" className="text-amber-500">Stop-Limit</Badge>;
      case 'trailing_stop':
        return <Badge variant="outline" className="text-purple-500">Trailing</Badge>;
      case 'oco':
        return <Badge variant="outline" className="text-blue-500">OCO</Badge>;
      default:
        return <Badge variant="outline">{orderType}</Badge>;
    }
  };

  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderOrderTable = (orderList: typeof orders, showCancel = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Symbol</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Side</TableHead>
          <TableHead className="text-right">Quantity</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Filled</TableHead>
          <TableHead>Status</TableHead>
          {showCancel && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {orderList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showCancel ? 9 : 8} className="text-center py-8 text-muted-foreground">
              No orders found
            </TableCell>
          </TableRow>
        ) : (
          orderList.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(order.created_at).toLocaleString()}
              </TableCell>
              <TableCell className="font-medium">{order.symbol}</TableCell>
              <TableCell>{getOrderTypeBadge(order.order_type)}</TableCell>
              <TableCell>
                <Badge variant={order.side === 'buy' ? 'default' : 'destructive'}>
                  {order.side.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {order.quantity.toFixed(4)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {order.price ? `$${order.price.toLocaleString()}` : 'Market'}
              </TableCell>
              <TableCell className="text-right font-mono">
                <span className={cn(
                  (order.filled_quantity || 0) > 0 && "text-green-500"
                )}>
                  {(order.filled_quantity || 0).toFixed(4)}
                </span>
              </TableCell>
              <TableCell>{getStatusBadge(order.status)}</TableCell>
              {showCancel && (
                <TableCell className="text-right">
                  {(order.status === 'open' || order.status === 'pending') && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingOrder === order.id}
                    >
                      {cancellingOrder === order.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-destructive" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5" />
              Order Management
            </CardTitle>
            <CardDescription>Track and manage your trading orders</CardDescription>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Open:</span>
              <span className="font-bold">{openOrders.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Filled:</span>
              <span className="font-bold">{filledOrders.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total Fees:</span>
              <span className="font-bold">${totalFees.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="open">
          <TabsList className="mb-4">
            <TabsTrigger value="open" className="gap-2">
              <Clock className="h-4 w-4" />
              Open ({openOrders.length})
            </TabsTrigger>
            <TabsTrigger value="filled" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Filled ({filledOrders.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-2">
              <XCircle className="h-4 w-4" />
              Cancelled ({cancelledOrders.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({orders.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="open">
            {renderOrderTable(openOrders, true)}
          </TabsContent>
          
          <TabsContent value="filled">
            {renderOrderTable(filledOrders)}
          </TabsContent>
          
          <TabsContent value="cancelled">
            {renderOrderTable(cancelledOrders)}
          </TabsContent>
          
          <TabsContent value="all">
            {renderOrderTable(orders, true)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
