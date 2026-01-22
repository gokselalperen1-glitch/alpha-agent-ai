import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Clock, Zap, CheckCircle, Activity, Pause } from 'lucide-react';
import { useAITrading } from '@/hooks/useAITrading';
import { useToast } from '@/hooks/use-toast';
import { TradingControls } from './TradingControls';
import { PortfolioSummary } from './PortfolioSummary';
import { PositionsList } from './PositionsList';
import { TradeHistory } from './TradeHistory';
import { PendingOrderCard } from './PendingOrderCard';

interface AITraderProps {
  userId: string;
}

const SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT'];

export const AITrader = ({ userId }: AITraderProps) => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaperTrading, setIsPaperTrading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const {
    isAnalyzing,
    balance,
    positions,
    pendingOrders,
    tradeHistory,
    lastPrice,
    analyzeMarket,
    addPendingOrder,
    approveOrder,
    rejectOrder,
    expireOldOrders,
    calculatePortfolioValue
  } = useAITrading({ userId });

  // Auto-expire old orders
  useEffect(() => {
    const interval = setInterval(expireOldOrders, 10000);
    return () => clearInterval(interval);
  }, [expireOldOrders]);

  // Main analysis function
  const runAnalysis = useCallback(async () => {
    const suggestion = await analyzeMarket(selectedSymbol);
    if (suggestion) {
      addPendingOrder(suggestion);
      toast({
        title: `New ${suggestion.side.toUpperCase()} Signal`,
        description: `AI recommends ${suggestion.side}ing ${selectedSymbol} at $${suggestion.price.toLocaleString()}`
      });
    }
  }, [selectedSymbol, analyzeMarket, addPendingOrder, toast]);

  // Auto-analyze when running
  useEffect(() => {
    if (!isRunning) return;
    
    // Run immediately
    runAnalysis();
    
    // Then every 30 seconds
    const interval = setInterval(runAnalysis, 30000);
    
    return () => clearInterval(interval);
  }, [isRunning, runAnalysis]);

  const handleApprove = async (order: any) => {
    setProcessingOrderId(order.id);
    await approveOrder(order, isPaperTrading);
    setProcessingOrderId(null);
  };

  const handleReject = (order: any) => {
    rejectOrder(order);
  };

  const portfolioValue = calculatePortfolioValue();

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
          <TradingControls
            isRunning={isRunning}
            isAnalyzing={isAnalyzing}
            isPaperTrading={isPaperTrading}
            selectedSymbol={selectedSymbol}
            symbols={SYMBOLS}
            onToggleRunning={() => setIsRunning(!isRunning)}
            onAnalyzeNow={runAnalysis}
            onSymbolChange={setSelectedSymbol}
            onPaperTradingChange={setIsPaperTrading}
          />

          <PortfolioSummary
            balance={balance}
            portfolioValue={portfolioValue}
            positionsCount={positions.length}
            pendingOrdersCount={pendingOrders.length}
          />
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
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isProcessing={processingOrderId === order.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="positions">
          <PositionsList positions={positions} lastPrice={lastPrice} />
        </TabsContent>

        <TabsContent value="history">
          <TradeHistory history={tradeHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
