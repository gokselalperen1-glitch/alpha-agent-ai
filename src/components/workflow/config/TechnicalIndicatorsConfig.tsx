import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface TechnicalIndicatorsConfigProps {
  config: any;
  onUpdate: (config: any) => void;
}

const INDICATORS = [
  { value: 'rsi', label: 'RSI (Relative Strength Index)', description: 'Momentum oscillator (0-100)' },
  { value: 'macd', label: 'MACD', description: 'Moving Average Convergence Divergence' },
  { value: 'sma', label: 'SMA (Simple Moving Average)', description: 'Average price over period' },
  { value: 'ema', label: 'EMA (Exponential Moving Average)', description: 'Weighted average favoring recent prices' },
  { value: 'bbands', label: 'Bollinger Bands', description: 'Volatility bands around SMA' },
];

const TIMEFRAMES = [
  { value: '1min', label: '1 Minute' },
  { value: '5min', label: '5 Minutes' },
  { value: '15min', label: '15 Minutes' },
  { value: '60min', label: '1 Hour' },
  { value: 'daily', label: 'Daily' },
];

export const TechnicalIndicatorsConfig = ({ config, onUpdate }: TechnicalIndicatorsConfigProps) => {
  const [symbol, setSymbol] = useState(config.symbol || 'BTC/USDT');
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(config.indicators || ['rsi']);
  const [timeframe, setTimeframe] = useState(config.timeframe || '60min');
  const [timePeriod, setTimePeriod] = useState(config.timePeriod || '14');

  useEffect(() => {
    onUpdate({
      symbol,
      indicators: selectedIndicators,
      timeframe,
      timePeriod: parseInt(timePeriod) || 14,
    });
  }, [symbol, selectedIndicators, timeframe, timePeriod]);

  const toggleIndicator = (indicator: string) => {
    setSelectedIndicators(prev =>
      prev.includes(indicator)
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Symbol</Label>
        <Input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="BTC/USDT"
        />
      </div>

      <div className="space-y-2">
        <Label>Timeframe</Label>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEFRAMES.map((tf) => (
              <SelectItem key={tf.value} value={tf.value}>
                {tf.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Time Period (for RSI, SMA, EMA)</Label>
        <Input
          type="number"
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value)}
          placeholder="14"
          min="1"
          max="200"
        />
        <p className="text-xs text-muted-foreground">
          Number of periods to calculate indicators
        </p>
      </div>

      <div className="space-y-3">
        <Label>Select Indicators</Label>
        {INDICATORS.map((indicator) => (
          <div key={indicator.value} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50">
            <Checkbox
              id={indicator.value}
              checked={selectedIndicators.includes(indicator.value)}
              onCheckedChange={() => toggleIndicator(indicator.value)}
            />
            <div className="flex-1">
              <label
                htmlFor={indicator.value}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {indicator.label}
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                {indicator.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          {selectedIndicators.length} indicator{selectedIndicators.length !== 1 ? 's' : ''} selected
        </p>
      </div>
    </div>
  );
};
