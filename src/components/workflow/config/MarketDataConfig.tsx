import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface MarketDataConfigProps {
  config: any;
  onUpdate: (config: any) => void;
}

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"];
const POPULAR_SYMBOLS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT"];

export const MarketDataConfig = ({ config, onUpdate }: MarketDataConfigProps) => {
  const [symbols, setSymbols] = useState<string[]>(config.symbols || []);
  const [inputValue, setInputValue] = useState("");
  const [timeframe, setTimeframe] = useState(config.timeframe || "1h");

  useEffect(() => {
    onUpdate({
      symbols,
      timeframe,
    });
  }, [symbols, timeframe]);

  const addSymbol = (symbol: string) => {
    const formattedSymbol = symbol.toUpperCase().trim();
    if (formattedSymbol && !symbols.includes(formattedSymbol)) {
      setSymbols([...symbols, formattedSymbol]);
      setInputValue("");
    }
  };

  const removeSymbol = (symbol: string) => {
    setSymbols(symbols.filter(s => s !== symbol));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSymbol(inputValue);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Trading Pairs</Label>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g., BTC/USDT"
        />
        <p className="text-xs text-muted-foreground">
          Press Enter to add symbols
        </p>
      </div>

      {symbols.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {symbols.map((symbol) => (
            <Badge key={symbol} variant="secondary" className="pr-1">
              {symbol}
              <button
                onClick={() => removeSymbol(symbol)}
                className="ml-1 hover:bg-background/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label>Quick Add</Label>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SYMBOLS.map((symbol) => (
            <Button
              key={symbol}
              variant="outline"
              size="sm"
              onClick={() => addSymbol(symbol)}
              disabled={symbols.includes(symbol)}
              className="text-xs"
            >
              {symbol}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Timeframe</Label>
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEFRAMES.map((tf) => (
              <SelectItem key={tf} value={tf}>
                {tf}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          {symbols.length > 0
            ? `Fetching ${timeframe} data for ${symbols.length} symbol${symbols.length > 1 ? 's' : ''}`
            : "Add symbols to fetch market data"}
        </p>
      </div>
    </div>
  );
};
