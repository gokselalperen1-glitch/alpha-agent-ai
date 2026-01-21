import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, Play, Pause, RefreshCw, TrendingUp, TrendingDown, 
  CheckCircle, XCircle, Clock, Zap, AlertTriangle, Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PendingOrderCard, PendingOrder } from './PendingOrderCard';

interface ExecutedOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  status: 'approved' | 'rejected';
  executedAt: Date;
  pnl?: number;
}

interface AITraderProps {
  userId: string;
}

export const AITrader = ({ userId }: AITraderProps) => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPaperTrading, setIsPaperTrading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [executedOrders, setExecutedOrders] = useState<ExecutedOrder[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [balance, setBalance] = useState(10000);
  const [positions, setPositions] = useState<{ symbol: string; quantity: number; avgPrice: number }[]>([]);

  const SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'];

  // Auto-expire old orders
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingOrders(prev => prev.filter(o => new Date() < o.expiresAt));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const analyzeAndGenerateOrder = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    try {
      // Step 1: Get market data
      const { data: tickData, error: tickError } = await supabase.functions.invoke('demo-agent-tick', {
        body: { strategy: 'multi-indicator', symbol: selectedSymbol.split('/')[0] }
      });

      if (tickError) throw tickError;

      // Step 2: Get AI analysis
      const { data: aiData, error: aiError } = await supabase.functions.invoke('market-context-analyzer', {
        body: {
          symbol: selectedSymbol,
          marketData: {
            price: tickData.price,
            change24h: tickData.change24h,
            high20: tickData.high20,
            low20: tickData.low20
          },
          indicators: {
            rsi: tickData.rsi,
            macd: tickData.macdHistogram,
            sma20: tickData.sma20,
            bollingerUpper: tickData.bollingerUpper,
            bollingerLower: tickData.bollingerLower
          },
          sentiment: {
            score: tickData.indicatorVotes?.totalScore || 0,
            sources: ['technical_analysis']
          }
        }
      });

      if (aiError) throw aiError;

      setLastAnalysis({
        ...tickData,
        aiRecommendation: aiData?.analysis
      });

      // Step 3: Generate order if AI recommends action
      const recommendation = aiData?.analysis?.recommendations;
      const signal = recommendation?.action;

      if (signal === 'buy' || signal === 'sell') {
        const currentPosition = positions.find(p => p.symbol === selectedSymbol);
        
        // Only generate buy if we have balance and no position
        // Only generate sell if we have a position
        if ((signal === 'buy' && !currentPosition && balance > 0) ||
            (signal === 'sell' && currentPosition)) {
          
          const quantity = signal === 'buy' 
            ? (balance * 0.1) / tickData.price  // 10% of balance
            : currentPosition!.quantity;

          const newOrder: PendingOrder = {
            id: `order-${Date.now()}`,
            symbol: selectedSymbol,
            side: signal,
            quantity,
            price: tickData.price,
            confidence: (aiData?.analysis?.confidence || 70) / 100,
            reasoning: aiData?.analysis?.reasoning || tickData.reasoning || 'Based on technical indicator analysis',
            indicators: {
              rsi: tickData.rsi,
              macd: tickData.macdHistogram > 0 ? 'Bullish' : 'Bearish',
              trend: tickData.price > tickData.sma20 ? 'Uptrend' : 'Downtrend'
            },
            riskScore: aiData?.analysis?.riskScore || 50,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
          };

          setPendingOrders(prev => [...prev, newOrder]);

          toast({
            title: `New ${signal.toUpperCase()} Signal`,
            description: `AI recommends ${signal}ing ${selectedSymbol} at $${tickData.price.toLocaleString()}`,
          });
        }
      }

    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Failed to analyze market',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedSymbol, balance, positions, isAnalyzing, toast]);

  // Auto-analyze when running
  useEffect(() => {
    if (!isRunning) return;
    
    analyzeAndGenerateOrder();
    const interval = setInterval(analyzeAndGenerateOrder, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, [isRunning, analyzeAndGenerateOrder]);

  const handleApproveOrder = async (order: PendingOrder) => {
    setProcessingOrderId(order.id);

    try {
      if (order.side === 'buy') {
        const cost = order.quantity * order.price;
        if (cost > balance) {
          throw new Error('Insufficient balance');
        }
        setBalance(prev => prev - cost);
        setPositions(prev => [...prev, {
          symbol: order.symbol,
          quantity: order.quantity,
          avgPrice: order.price
        }]);
      } else {
        const position = positions.find(p => p.symbol === order.symbol);
        if (position) {
          const saleValue = order.quantity * order.price;
          setBalance(prev => prev + saleValue);
          setPositions(prev => prev.filter(p => p.symbol !== order.symbol));
        }
      }

      // Record the executed order
      setExecutedOrders(prev => [...prev, {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        status: 'approved',
        executedAt: new Date()
      }]);

      // If live trading, execute on exchange
      if (!isPaperTrading) {
        await supabase.functions.invoke('advanced-trade-executor', {
          body: {
            symbol: order.symbol,
            side: order.side,
            orderType: 'market',
            quantity: order.quantity,
            isPaperTrading: false
          }
        });
      }

      setPendingOrders(prev => prev.filter(o => o.id !== order.id));

      toast({
        title: 'Order Executed',
        description: `${order.side.toUpperCase()} ${order.quantity.toFixed(6)} ${order.symbol} @ $${order.price.toLocaleString()}`
      });

    } catch (error: any) {
      toast({
        title: 'Execution Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleRejectOrder = (order: PendingOrder) => {
    setExecutedOrders(prev => [...prev, {
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      price: order.price,
      status: 'rejected',
      executedAt: new Date()
    }]);
    setPendingOrders(prev => prev.filter(o => o.id !== order.id));
    
    toast({
      title: 'Order Rejected',
      description: `Skipped ${order.side} ${order.symbol}`,
    });
  };

  const portfolioValue = balance + positions.reduce((sum, p) => {
    const currentPrice = lastAnalysis?.price || p.avgPrice;
    return sum + (p.quantity * currentPrice);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>AI Trading Assistant</CardTitle>
                <CardDescription>AI analyzes markets and suggests trades for your approval</CardDescription>
              </div>
            </div>
            <Badge variant={isRunning ? 'default' : 'secondary'} className="gap-1">
              {isRunning ? <Activity className="h-3 w-3 animate-pulse" /> : <Pause className="h-3 w-3" />}
              {isRunning ? 'ACTIVE' : 'PAUSED'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings Row */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Symbol:</Label>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol} disabled={isRunning}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYMBOLS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch 
                id="paper-mode" 
                checked={isPaperTrading} 
                onCheckedChange={setIsPaperTrading}
                disabled={isRunning}
              />
              <Label htmlFor="paper-mode" className="flex items-center gap-1">
                {isPaperTrading ? '📝 Paper Trading' : '💰 Live Trading'}
              </Label>
            </div>

            <div className="flex-1" />

            <Button
              variant="outline"
              size="sm"
              onClick={analyzeAndGenerateOrder}
              disabled={isAnalyzing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
              Analyze Now
            </Button>

            <Button
              variant={isRunning ? 'destructive' : 'default'}
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop AI
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start AI
                </>
              )}
            </Button>
          </div>

          {/* Portfolio Summary */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Cash Balance</p>
              <p className="text-lg font-bold font-mono">${balance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Portfolio Value</p>
              <p className="text-lg font-bold font-mono">${portfolioValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open Positions</p>
              <p className="text-lg font-bold">{positions.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Orders</p>
              <p className="text-lg font-bold text-primary">{pendingOrders.length}</p>
            </div>
          </div>

          {!isPaperTrading && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-yellow-600 dark:text-yellow-400">
                Live trading enabled - real funds will be used when you approve orders
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending Orders
            {pendingOrders.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-2">
            <Zap className="h-4 w-4" />
            Positions
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No pending orders</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isRunning 
                    ? 'AI is analyzing markets. Orders will appear here when opportunities are found.'
                    : 'Start the AI to begin analyzing markets and generating trade suggestions.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingOrders.map(order => (
                <PendingOrderCard
                  key={order.id}
                  order={order}
                  onApprove={handleApproveOrder}
                  onReject={handleRejectOrder}
                  isProcessing={processingOrderId === order.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="positions">
          {positions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No open positions</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Approve a buy order to open a position
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {positions.map(position => {
                const currentPrice = lastAnalysis?.price || position.avgPrice;
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
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {executedOrders.length === 0 ? (
                  <div className="py-12 text-center">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No order history</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {executedOrders.slice().reverse().map(order => (
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
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
