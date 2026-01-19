import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, Zap, Wallet, TrendingUp, Shield, Target } from "lucide-react";
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
const LEVERAGE_PRESETS = [1, 2, 3, 5, 10, 20, 50, 100, 125];

export const ExecuteTradeConfig = ({ config, onUpdate }: ExecuteTradeConfigProps) => {
  const navigate = useNavigate();
  
  // Basic trade settings
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
  
  // Position type: spot or futures
  const [positionType, setPositionType] = useState(config.positionType || "spot");
  
  // Leverage settings (for futures)
  const [leverage, setLeverage] = useState(config.leverage || 1);
  const [marginType, setMarginType] = useState(config.marginType || "isolated");
  
  // Advanced order settings
  const [timeInForce, setTimeInForce] = useState(config.timeInForce || "GTC");
  const [reduceOnly, setReduceOnly] = useState(config.reduceOnly || false);
  const [postOnly, setPostOnly] = useState(config.postOnly || false);
  
  // Trailing stop settings
  const [enableTrailingStop, setEnableTrailingStop] = useState(config.enableTrailingStop || false);
  const [trailingStopPercent, setTrailingStopPercent] = useState(config.trailingStopPercent?.toString() || "1");
  
  // OCO settings
  const [enableOCO, setEnableOCO] = useState(config.enableOCO || false);
  const [ocoStopPrice, setOcoStopPrice] = useState(config.ocoStopPrice?.toString() || "");
  const [ocoLimitPrice, setOcoLimitPrice] = useState(config.ocoLimitPrice?.toString() || "");
  
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
      // Leverage & Position settings
      positionType,
      leverage: positionType === "futures" ? leverage : 1,
      marginType: positionType === "futures" ? marginType : undefined,
      // Advanced settings
      timeInForce,
      reduceOnly: positionType === "futures" ? reduceOnly : false,
      postOnly: orderType === "limit" ? postOnly : false,
      // Trailing stop
      enableTrailingStop,
      trailingStopPercent: enableTrailingStop ? parseFloat(trailingStopPercent) : undefined,
      // OCO
      enableOCO,
      ocoStopPrice: enableOCO && ocoStopPrice ? parseFloat(ocoStopPrice) : undefined,
      ocoLimitPrice: enableOCO && ocoLimitPrice ? parseFloat(ocoLimitPrice) : undefined,
    });
  }, [
    symbol, orderType, side, quantityType, quantityValue, limitPrice, 
    stopLoss, takeProfit, enableStopLoss, enableTakeProfit, isPaperTrading, 
    exchangeConnectionId, positionType, leverage, marginType, timeInForce,
    reduceOnly, postOnly, enableTrailingStop, trailingStopPercent,
    enableOCO, ocoStopPrice, ocoLimitPrice
  ]);

  const selectedConnection = connections.find(c => c.id === exchangeConnectionId);
  const hasTradePermission = selectedConnection?.permissions?.trade === true;

  // Calculate estimated liquidation price for futures
  const estimatedLiquidationPrice = positionType === "futures" && leverage > 1 
    ? (side === "buy" 
        ? "Entry - (Entry / leverage)" 
        : "Entry + (Entry / leverage)")
    : null;

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
            </>
          )}
        </div>
      )}

      {/* Position Type: Spot vs Futures */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Position Type
        </Label>
        <Tabs value={positionType} onValueChange={setPositionType}>
          <TabsList className="w-full">
            <TabsTrigger value="spot" className="flex-1">Spot</TabsTrigger>
            <TabsTrigger value="futures" className="flex-1">Futures</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Leverage Settings (Futures only) */}
      {positionType === "futures" && (
        <div className="space-y-4 p-3 rounded-lg bg-muted/30 border border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <Target className="h-4 w-4" />
            <Label className="font-medium">Leverage Settings</Label>
          </div>
          
          {/* Leverage Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Leverage</Label>
              <Badge variant="outline" className="text-lg font-bold">{leverage}x</Badge>
            </div>
            <Slider
              value={[leverage]}
              onValueChange={(v) => setLeverage(v[0])}
              min={1}
              max={125}
              step={1}
              className="py-2"
            />
            <div className="flex flex-wrap gap-1">
              {LEVERAGE_PRESETS.map((l) => (
                <Button
                  key={l}
                  variant={leverage === l ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setLeverage(l)}
                >
                  {l}x
                </Button>
              ))}
            </div>
            {leverage > 20 && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  High leverage ({leverage}x) significantly increases liquidation risk!
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Margin Type */}
          <div className="space-y-2">
            <Label>Margin Type</Label>
            <Select value={marginType} onValueChange={setMarginType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="isolated">
                  <div className="flex flex-col">
                    <span>Isolated Margin</span>
                    <span className="text-xs text-muted-foreground">Risk limited to position margin</span>
                  </div>
                </SelectItem>
                <SelectItem value="cross">
                  <div className="flex flex-col">
                    <span>Cross Margin</span>
                    <span className="text-xs text-muted-foreground">Uses full account balance</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Liquidation Info */}
          <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs">
            <p className="font-medium text-destructive">⚠️ Liquidation Estimate</p>
            <p className="text-muted-foreground mt-1">
              {marginType === "isolated" 
                ? `At ${leverage}x leverage, liquidation occurs ~${((1 / leverage) * 100).toFixed(1)}% from entry`
                : "Cross margin uses your entire balance to prevent liquidation"}
            </p>
          </div>

          {/* Reduce Only Option */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Reduce Only</Label>
              <p className="text-xs text-muted-foreground">Only reduce existing position</p>
            </div>
            <Switch checked={reduceOnly} onCheckedChange={setReduceOnly} />
          </div>
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
            <SelectItem value="stop_limit">Stop-Limit Order</SelectItem>
            <SelectItem value="stop_market">Stop-Market Order</SelectItem>
            {positionType === "futures" && (
              <SelectItem value="trailing_stop">Trailing Stop</SelectItem>
            )}
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
            <SelectItem value="buy">
              {positionType === "futures" ? "Long / Buy" : "Buy"}
            </SelectItem>
            <SelectItem value="sell">
              {positionType === "futures" ? "Short / Sell" : "Sell"}
            </SelectItem>
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
      {(orderType === "limit" || orderType === "stop_limit") && (
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

      {/* Stop Price for stop orders */}
      {(orderType === "stop_limit" || orderType === "stop_market") && (
        <div className="space-y-2">
          <Label>Stop/Trigger Price (USDT)</Label>
          <Input
            type="number"
            value={ocoStopPrice}
            onChange={(e) => setOcoStopPrice(e.target.value)}
            placeholder="e.g., 48000"
            step="0.01"
          />
          <p className="text-xs text-muted-foreground">
            Order triggers when price reaches this level
          </p>
        </div>
      )}

      {/* Advanced Order Options */}
      <div className="space-y-3 pt-2 border-t">
        <Label className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Advanced Options
        </Label>

        {/* Time in Force */}
        <div className="space-y-2">
          <Label className="text-sm">Time in Force</Label>
          <Select value={timeInForce} onValueChange={setTimeInForce}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GTC">GTC (Good Till Cancelled)</SelectItem>
              <SelectItem value="IOC">IOC (Immediate or Cancel)</SelectItem>
              <SelectItem value="FOK">FOK (Fill or Kill)</SelectItem>
              {positionType === "futures" && (
                <SelectItem value="GTX">GTX (Post Only)</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Post Only (for limit orders) */}
        {orderType === "limit" && (
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Post Only</Label>
              <p className="text-xs text-muted-foreground">Only add liquidity, no taker fees</p>
            </div>
            <Switch checked={postOnly} onCheckedChange={setPostOnly} />
          </div>
        )}

        {/* OCO Order */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">OCO Order</Label>
              <p className="text-xs text-muted-foreground">One-Cancels-the-Other</p>
            </div>
            <Switch checked={enableOCO} onCheckedChange={setEnableOCO} />
          </div>
          {enableOCO && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label className="text-xs">Stop Price</Label>
                <Input
                  type="number"
                  value={ocoStopPrice}
                  onChange={(e) => setOcoStopPrice(e.target.value)}
                  placeholder="Stop"
                  step="0.01"
                />
              </div>
              <div>
                <Label className="text-xs">Limit Price</Label>
                <Input
                  type="number"
                  value={ocoLimitPrice}
                  onChange={(e) => setOcoLimitPrice(e.target.value)}
                  placeholder="Limit"
                  step="0.01"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stop Loss & Take Profit */}
      <div className="space-y-3 pt-2 border-t">
        {/* Trailing Stop */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <Label>Trailing Stop</Label>
              <p className="text-xs text-muted-foreground">Dynamic stop follows price</p>
            </div>
            <Switch checked={enableTrailingStop} onCheckedChange={setEnableTrailingStop} />
          </div>
          {enableTrailingStop && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={trailingStopPercent}
                onChange={(e) => setTrailingStopPercent(e.target.value)}
                placeholder="1.0"
                step="0.1"
                min="0.1"
                max="50"
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">% from peak</span>
            </div>
          )}
        </div>

        {/* Stop Loss */}
        <div className="space-y-2">
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
      </div>

      {/* Summary */}
      <div className="pt-4 border-t">
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">
              {isPaperTrading ? "📝 Paper" : "💰 Live"} {side.toUpperCase()} {symbol}
            </p>
            {positionType === "futures" && (
              <Badge variant="secondary" className="text-xs">{leverage}x {marginType}</Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {orderType === "market" ? "Market" : `${orderType.replace('_', '-')} @ $${limitPrice || '—'}`} order • {quantityType === "percentage" ? `${quantityValue}% of balance` : `${quantityValue} units`}
          </p>
          {enableTrailingStop && (
            <p className="text-xs text-primary">Trailing stop: {trailingStopPercent}%</p>
          )}
          {enableOCO && (
            <p className="text-xs text-primary">OCO: Stop ${ocoStopPrice} / Limit ${ocoLimitPrice}</p>
          )}
          {!isPaperTrading && exchangeConnectionId === "auto" && (
            <p className="text-xs text-primary">Auto-selecting optimal exchange</p>
          )}
        </div>
      </div>
    </div>
  );
};