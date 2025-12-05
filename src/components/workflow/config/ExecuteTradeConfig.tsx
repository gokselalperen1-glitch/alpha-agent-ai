import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Zap, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ExchangeConnection {
  id: string;
  exchange_name: string;
  health_status: string | null;
  is_testnet: boolean | null;
  permissions: { read?: boolean; trade?: boolean; withdraw?: boolean } | null;
}

interface ExecuteTradeConfigProps {
  config: any;
  onUpdate: (config: any) => void;
}

const POPULAR_SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"];

export const ExecuteTradeConfig = ({ config, onUpdate }: ExecuteTradeConfigProps) => {
  const navigate = useNavigate();
  const [symbol, setSymbol] = useState(config.symbol || "BTC/USDT");
  const [orderType, setOrderType] = useState(config.orderType || "market");
  const [side, setSide] = useState(config.side || "buy");
  const [quantityType, setQuantityType] = useState(config.quantityType || "percentage");
  const [quantityValue, setQuantityValue] = useState(config.quantityValue?.toString() || "10");
  const [limitPrice, setLimitPrice] = useState(config.limitPrice?.toString() || "");
  const [stopLoss, setStopLoss] = useState(config.stopLoss?.toString() || "");
  const [takeProfit, setTakeProfit] = useState(config.takeProfit?.toString() || "");
  const [enableStopLoss, setEnableStopLoss] = useState(!!config.stopLoss);
  const [enableTakeProfit, setEnableTakeProfit] = useState(!!config.takeProfit);
  const [isPaperTrading, setIsPaperTrading] = useState(config.isPaperTrading !== false);
  const [exchangeConnectionId, setExchangeConnectionId] = useState<string>(config.exchangeConnectionId || "auto");
  
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);

  // Fetch user's exchange connections
  useEffect(() => {
    const fetchConnections = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('exchange_connections')
        .select('id, exchange_name, health_status, is_testnet, permissions')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (!error && data) {
        setConnections(data as ExchangeConnection[]);
      }
      setLoadingConnections(false);
    };

    fetchConnections();
  }, []);

  useEffect(() => {
    onUpdate({
      symbol,
      orderType,
      side,
      quantityType,
      quantityValue: parseFloat(quantityValue) || 0,
      limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
      stopLoss: enableStopLoss && stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: enableTakeProfit && takeProfit ? parseFloat(takeProfit) : undefined,
      isPaperTrading,
      exchangeConnectionId: exchangeConnectionId === "auto" ? undefined : exchangeConnectionId,
    });
  }, [symbol, orderType, side, quantityType, quantityValue, limitPrice, stopLoss, takeProfit, enableStopLoss, enableTakeProfit, isPaperTrading, exchangeConnectionId]);

  const selectedConnection = connections.find(c => c.id === exchangeConnectionId);
  const hasTradePermission = selectedConnection?.permissions?.trade === true;

  return (
    <div className="space-y-4">
      {/* Paper Trading Toggle */}
      <div className="p-3 rounded-lg bg-muted/50 border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <Label className="font-medium">Paper Trading Mode</Label>
          </div>
          <Switch 
            checked={isPaperTrading} 
            onCheckedChange={setIsPaperTrading} 
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {isPaperTrading 
            ? "Simulated trades - no real money involved" 
            : "⚠️ Live trading - real money will be used"}
        </p>
      </div>

      {/* Exchange Selection - Only shown for live trading */}
      {!isPaperTrading && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Exchange Connection
          </Label>
          {loadingConnections ? (
            <div className="text-sm text-muted-foreground">Loading exchanges...</div>
          ) : connections.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>No exchange connections found</span>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 h-auto"
                  onClick={() => navigate('/exchange-connections')}
                >
                  Connect Exchange
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Select value={exchangeConnectionId} onValueChange={setExchangeConnectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exchange" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-select Best Exchange</SelectItem>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <div className="flex items-center gap-2">
                        <span>{conn.exchange_name}</span>
                        {conn.is_testnet && (
                          <Badge variant="outline" className="text-xs">Testnet</Badge>
                        )}
                        <span className={`h-2 w-2 rounded-full ${
                          conn.health_status === 'healthy' ? 'bg-green-500' : 
                          conn.health_status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedConnection && !hasTradePermission && exchangeConnectionId !== "auto" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This connection doesn't have trading permissions enabled.
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-xs text-muted-foreground">
                "Auto-select" chooses the best exchange based on fees and liquidity.
              </p>
            </>
          )}
        </div>
      )}

      {/* Trading Symbol */}
      <div className="space-y-2">
        <Label>Trading Pair</Label>
        <Input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="BTC/USDT"
        />
        <div className="flex flex-wrap gap-1 mt-1">
          {POPULAR_SYMBOLS.map((s) => (
            <Button
              key={s}
              variant={symbol === s ? "default" : "outline"}
              size="sm"
              className="text-xs h-6 px-2"
              onClick={() => setSymbol(s)}
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Order Type */}
      <div className="space-y-2">
        <Label>Order Type</Label>
        <Select value={orderType} onValueChange={setOrderType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="market">Market Order</SelectItem>
            <SelectItem value="limit">Limit Order</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Side */}
      <div className="space-y-2">
        <Label>Side</Label>
        <Select value={side} onValueChange={setSide}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="sell">Sell</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quantity Type */}
      <div className="space-y-2">
        <Label>Quantity Type</Label>
        <Select value={quantityType} onValueChange={setQuantityType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">% of Balance</SelectItem>
            <SelectItem value="fixed">Fixed Amount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quantity Value */}
      <div className="space-y-2">
        <Label>
          {quantityType === "percentage" ? "Percentage (%)" : "Amount"}
        </Label>
        <Input
          type="number"
          value={quantityValue}
          onChange={(e) => setQuantityValue(e.target.value)}
          placeholder={quantityType === "percentage" ? "10" : "0.01"}
          step={quantityType === "percentage" ? "1" : "0.01"}
          min="0"
          max={quantityType === "percentage" ? "100" : undefined}
        />
        <p className="text-xs text-muted-foreground">
          {quantityType === "percentage" 
            ? "Max 5% per trade enforced for safety" 
            : "Fixed quantity to trade"}
        </p>
      </div>

      {/* Limit Price */}
      {orderType === "limit" && (
        <div className="space-y-2">
          <Label>Limit Price (USDT)</Label>
          <Input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder="e.g., 50000"
            step="0.01"
          />
        </div>
      )}

      {/* Stop Loss */}
      <div className="space-y-2 pt-2 border-t">
        <div className="flex items-center justify-between">
          <Label>Stop Loss</Label>
          <Switch checked={enableStopLoss} onCheckedChange={setEnableStopLoss} />
        </div>
        {enableStopLoss && (
          <Input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder="Price (USDT)"
            step="0.01"
          />
        )}
      </div>

      {/* Take Profit */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Take Profit</Label>
          <Switch checked={enableTakeProfit} onCheckedChange={setEnableTakeProfit} />
        </div>
        {enableTakeProfit && (
          <Input
            type="number"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            placeholder="Price (USDT)"
            step="0.01"
          />
        )}
      </div>

      {/* Summary */}
      <div className="pt-4 border-t">
        <div className="text-sm space-y-1">
          <p className="font-medium">
            {isPaperTrading ? "📝 Paper" : "💰 Live"} {side.toUpperCase()} {symbol}
          </p>
          <p className="text-muted-foreground">
            {orderType === "market" ? "Market" : `Limit @ $${limitPrice}`} order • {quantityType === "percentage" ? `${quantityValue}% of balance` : `${quantityValue} units`}
          </p>
          {!isPaperTrading && exchangeConnectionId === "auto" && (
            <p className="text-xs text-primary">Auto-selecting optimal exchange</p>
          )}
        </div>
      </div>
    </div>
  );
};
