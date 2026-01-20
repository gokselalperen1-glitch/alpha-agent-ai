import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Edit2, X, AlertTriangle, Target, Shield } from 'lucide-react';
import { usePositions } from '@/hooks/usePositions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PositionManagerProps {
  userId: string;
  className?: string;
}

export const PositionManager = ({ userId, className }: PositionManagerProps) => {
  const {
    positions,
    isLoading,
    error,
    totalUnrealizedPnl,
    totalPositionValue,
    closePosition,
    updatePositionLevels,
  } = usePositions({ enableRealtime: true });

  const [editingPosition, setEditingPosition] = useState<string | null>(null);
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [trailingStop, setTrailingStop] = useState<string>('');
  const [closingPosition, setClosingPosition] = useState<string | null>(null);

  const handleEditPosition = (positionId: string, currentSL?: number, currentTP?: number, currentTrailing?: number) => {
    setEditingPosition(positionId);
    setStopLoss(currentSL?.toString() || '');
    setTakeProfit(currentTP?.toString() || '');
    setTrailingStop(currentTrailing?.toString() || '');
  };

  const handleSaveLevels = async () => {
    if (!editingPosition) return;

    try {
      await updatePositionLevels(editingPosition, {
        stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
        take_profit: takeProfit ? parseFloat(takeProfit) : undefined,
        trailing_stop_percent: trailingStop ? parseFloat(trailingStop) : undefined,
      });
      toast.success('Position levels updated');
      setEditingPosition(null);
    } catch (err) {
      toast.error('Failed to update position');
    }
  };

  const handleClosePosition = async (positionId: string) => {
    setClosingPosition(positionId);
    try {
      await closePosition(positionId);
      toast.success('Position closed successfully');
    } catch (err) {
      toast.error('Failed to close position');
    } finally {
      setClosingPosition(null);
    }
  };

  const activePositions = positions.filter(p => p.status === 'open');

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

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Position Manager
            </CardTitle>
            <CardDescription>Manage your open trading positions</CardDescription>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">Total Value</p>
              <p className="font-bold text-lg">${totalPositionValue.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Unrealized P&L</p>
              <p className={cn(
                "font-bold text-lg",
                totalUnrealizedPnl >= 0 ? "text-green-500" : "text-destructive"
              )}>
                {totalUnrealizedPnl >= 0 ? '+' : ''}{totalUnrealizedPnl.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activePositions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No open positions</p>
            <p className="text-sm mt-1">Positions will appear here when your agents execute trades</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Leverage</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>SL / TP</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activePositions.map((position) => {
                const pnl = position.unrealized_pnl || 0;
                const pnlPercent = position.entry_price > 0 
                  ? ((pnl / (position.entry_price * position.quantity)) * 100)
                  : 0;

                return (
                  <TableRow key={position.id}>
                    <TableCell className="font-medium">{position.symbol}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={position.side === 'long' ? 'default' : 'destructive'}
                        className="flex items-center gap-1 w-fit"
                      >
                        {position.side === 'long' ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {position.side.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{position.quantity.toFixed(4)}</TableCell>
                    <TableCell>${position.entry_price.toLocaleString()}</TableCell>
                    <TableCell>${(position.current_price || position.entry_price).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{position.leverage}x</Badge>
                    </TableCell>
                    <TableCell>
                      <div className={cn(
                        "font-medium",
                        pnl >= 0 ? "text-green-500" : "text-destructive"
                      )}>
                        <div>{pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}</div>
                        <div className="text-xs opacity-75">
                          ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        {position.stop_loss && (
                          <div className="text-destructive">SL: ${position.stop_loss}</div>
                        )}
                        {position.take_profit && (
                          <div className="text-green-500">TP: ${position.take_profit}</div>
                        )}
                        {position.trailing_stop_percent && (
                          <div className="text-muted-foreground">Trail: {position.trailing_stop_percent}%</div>
                        )}
                        {!position.stop_loss && !position.take_profit && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditPosition(
                                position.id,
                                position.stop_loss || undefined,
                                position.take_profit || undefined,
                                position.trailing_stop_percent || undefined
                              )}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Position Levels</DialogTitle>
                              <DialogDescription>
                                Set stop-loss, take-profit, and trailing stop for {position.symbol}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="stopLoss">Stop Loss Price</Label>
                                <Input
                                  id="stopLoss"
                                  type="number"
                                  placeholder="e.g., 95000"
                                  value={stopLoss}
                                  onChange={(e) => setStopLoss(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="takeProfit">Take Profit Price</Label>
                                <Input
                                  id="takeProfit"
                                  type="number"
                                  placeholder="e.g., 110000"
                                  value={takeProfit}
                                  onChange={(e) => setTakeProfit(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="trailingStop">Trailing Stop (%)</Label>
                                <Input
                                  id="trailingStop"
                                  type="number"
                                  placeholder="e.g., 2.5"
                                  value={trailingStop}
                                  onChange={(e) => setTrailingStop(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEditingPosition(null)}>
                                Cancel
                              </Button>
                              <Button onClick={handleSaveLevels}>
                                Save Changes
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleClosePosition(position.id)}
                          disabled={closingPosition === position.id}
                        >
                          {closingPosition === position.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-destructive" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
