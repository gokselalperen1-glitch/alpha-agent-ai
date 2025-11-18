import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface SentimentAnalysisConfigProps {
  config: any;
  onUpdate: (config: any) => void;
}

export const SentimentAnalysisConfig = ({ config, onUpdate }: SentimentAnalysisConfigProps) => {
  const [symbol, setSymbol] = useState(config.symbol || 'BTC');
  const [source, setSource] = useState(config.source || 'stocktwits');
  const [lookbackPeriod, setLookbackPeriod] = useState<number[]>([config.lookbackPeriod || 24]);
  const [threshold, setThreshold] = useState<number[]>([config.threshold || 0.3]);

  useEffect(() => {
    onUpdate({
      symbol,
      source,
      lookbackPeriod: lookbackPeriod[0],
      threshold: threshold[0],
    });
  }, [symbol, source, lookbackPeriod, threshold]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Symbol</Label>
        <Input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="BTC"
        />
        <p className="text-xs text-muted-foreground">
          Symbol without pair (e.g., BTC, not BTC/USDT)
        </p>
      </div>

      <div className="space-y-2">
        <Label>Data Source</Label>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stocktwits">StockTwits</SelectItem>
            <SelectItem value="news">Financial News (FinBERT)</SelectItem>
            <SelectItem value="combined">Combined Sources</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Lookback Period: {lookbackPeriod[0]} hours</Label>
        <Slider
          value={lookbackPeriod}
          onValueChange={setLookbackPeriod}
          min={1}
          max={168}
          step={1}
          className="py-4"
        />
        <p className="text-xs text-muted-foreground">
          Analyze sentiment from the last {lookbackPeriod[0]} hour{lookbackPeriod[0] !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-3">
        <Label>Sentiment Threshold: {(threshold[0] * 100).toFixed(0)}%</Label>
        <Slider
          value={threshold}
          onValueChange={setThreshold}
          min={0}
          max={1}
          step={0.05}
          className="py-4"
        />
        <p className="text-xs text-muted-foreground">
          Trigger only if sentiment exceeds {(threshold[0] * 100).toFixed(0)}% positive or negative
        </p>
      </div>

      <div className="p-3 rounded-lg bg-muted/50 space-y-1">
        <h4 className="text-sm font-medium">Sentiment Scale</h4>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Highly Negative</span>
            <span>-1.0 to -0.6</span>
          </div>
          <div className="flex justify-between">
            <span>Negative</span>
            <span>-0.6 to -0.2</span>
          </div>
          <div className="flex justify-between">
            <span>Neutral</span>
            <span>-0.2 to +0.2</span>
          </div>
          <div className="flex justify-between">
            <span>Positive</span>
            <span>+0.2 to +0.6</span>
          </div>
          <div className="flex justify-between">
            <span>Highly Positive</span>
            <span>+0.6 to +1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
