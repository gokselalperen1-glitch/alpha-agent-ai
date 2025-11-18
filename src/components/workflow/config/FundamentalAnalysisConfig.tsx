import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface FundamentalAnalysisConfigProps {
  config: any;
  onUpdate: (config: any) => void;
}

const METRICS = [
  { value: 'pe_ratio', label: 'P/E Ratio', description: 'Price to Earnings ratio' },
  { value: 'pb_ratio', label: 'P/B Ratio', description: 'Price to Book ratio' },
  { value: 'ps_ratio', label: 'P/S Ratio', description: 'Price to Sales ratio' },
  { value: 'eps', label: 'EPS', description: 'Earnings Per Share' },
  { value: 'revenue_growth', label: 'Revenue Growth', description: 'Year-over-year revenue growth' },
  { value: 'profit_margin', label: 'Profit Margin', description: 'Net profit margin %' },
  { value: 'debt_to_equity', label: 'Debt/Equity', description: 'Debt to Equity ratio' },
  { value: 'roe', label: 'ROE', description: 'Return on Equity %' },
  { value: 'current_ratio', label: 'Current Ratio', description: 'Liquidity measure' },
  { value: 'dividend_yield', label: 'Dividend Yield', description: 'Annual dividend yield %' },
];

export const FundamentalAnalysisConfig = ({ config, onUpdate }: FundamentalAnalysisConfigProps) => {
  const [symbol, setSymbol] = useState(config.symbol || '');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(
    config.metrics || ['pe_ratio', 'eps', 'revenue_growth']
  );

  useEffect(() => {
    onUpdate({
      symbol,
      metrics: selectedMetrics,
    });
  }, [symbol, selectedMetrics]);

  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Stock Symbol</Label>
        <Input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="AAPL"
        />
        <p className="text-xs text-muted-foreground">
          Enter a valid stock ticker symbol
        </p>
      </div>

      <div className="space-y-3">
        <Label>Select Metrics to Analyze</Label>
        {METRICS.map((metric) => (
          <div key={metric.value} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/50">
            <Checkbox
              id={metric.value}
              checked={selectedMetrics.includes(metric.value)}
              onCheckedChange={() => toggleMetric(metric.value)}
            />
            <div className="flex-1">
              <label
                htmlFor={metric.value}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {metric.label}
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          {selectedMetrics.length} metric{selectedMetrics.length !== 1 ? 's' : ''} selected
        </p>
      </div>
    </div>
  );
};
