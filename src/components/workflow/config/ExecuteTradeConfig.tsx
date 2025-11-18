import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface ExecuteTradeConfigProps {
  config: any;
  onUpdate: (config: any) => void;
}

export const ExecuteTradeConfig = ({ config, onUpdate }: ExecuteTradeConfigProps) => {
  const [orderType, setOrderType] = useState(config.orderType || "market");
  const [side, setSide] = useState(config.side || "buy");
  const [quantityType, setQuantityType] = useState(config.quantityType || "percentage");
  const [quantityValue, setQuantityValue] = useState(config.quantityValue || "10");
  const [limitPrice, setLimitPrice] = useState(config.limitPrice || "");
  const [stopLoss, setStopLoss] = useState(config.stopLoss || "");
  const [takeProfit, setTakeProfit] = useState(config.takeProfit || "");
  const [enableStopLoss, setEnableStopLoss] = useState(!!config.stopLoss);
  const [enableTakeProfit, setEnableTakeProfit] = useState(!!config.takeProfit);

  useEffect(() => {
    onUpdate({
      orderType,
      side,
      quantityType,
      quantityValue: parseFloat(quantityValue) || 0,
      limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
      stopLoss: enableStopLoss && stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: enableTakeProfit && takeProfit ? parseFloat(takeProfit) : undefined,
    });
  }, [orderType, side, quantityType, quantityValue, limitPrice, stopLoss, takeProfit, enableStopLoss, enableTakeProfit]);

  return (
    <div className="space-y-4">
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
        />
        <p className="text-xs text-muted-foreground">
          {quantityType === "percentage" 
            ? "Percentage of available balance to use" 
            : "Fixed quantity to trade"}
        </p>
      </div>

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

      <div className="space-y-4 pt-2">
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

      <div className="space-y-4">
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

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          {side === "buy" ? "Buy" : "Sell"} using {orderType} order
        </p>
      </div>
    </div>
  );
};
