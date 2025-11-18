import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface NewsMonitorConfigProps {
  config: any;
  onUpdate: (config: any) => void;
}

const SUGGESTED_KEYWORDS = [
  'earnings', 'merger', 'acquisition', 'SEC', 'lawsuit',
  'bankruptcy', 'partnership', 'IPO', 'dividend', 'buyback'
];

export const NewsMonitorConfig = ({ config, onUpdate }: NewsMonitorConfigProps) => {
  const [symbols, setSymbols] = useState<string[]>(config.symbols || []);
  const [keywords, setKeywords] = useState<string[]>(config.keywords || []);
  const [inputValue, setInputValue] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    onUpdate({
      symbols,
      keywords,
    });
  }, [symbols, keywords]);

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

  const addKeyword = (keyword: string) => {
    const formattedKeyword = keyword.toLowerCase().trim();
    if (formattedKeyword && !keywords.includes(formattedKeyword)) {
      setKeywords([...keywords, formattedKeyword]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleSymbolKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSymbol(inputValue);
    }
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword(keywordInput);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Symbols to Monitor</Label>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleSymbolKeyPress}
          placeholder="e.g., AAPL"
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
        <Label>Keywords to Filter</Label>
        <Input
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onKeyPress={handleKeywordKeyPress}
          placeholder="e.g., earnings"
        />
        <p className="text-xs text-muted-foreground">
          Only show news containing these keywords
        </p>
      </div>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <Badge key={keyword} variant="outline" className="pr-1">
              {keyword}
              <button
                onClick={() => removeKeyword(keyword)}
                className="ml-1 hover:bg-background/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label>Suggested Keywords</Label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_KEYWORDS.map((keyword) => (
            <Button
              key={keyword}
              variant="outline"
              size="sm"
              onClick={() => addKeyword(keyword)}
              disabled={keywords.includes(keyword)}
              className="text-xs"
            >
              {keyword}
            </Button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Monitoring {symbols.length} symbol{symbols.length !== 1 ? 's' : ''} 
          {keywords.length > 0 && ` for ${keywords.length} keyword${keywords.length !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  );
};
