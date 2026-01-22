import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RefreshCw, AlertTriangle, Activity } from 'lucide-react';

interface TradingControlsProps {
  isRunning: boolean;
  isAnalyzing: boolean;
  isPaperTrading: boolean;
  selectedSymbol: string;
  symbols: string[];
  onToggleRunning: () => void;
  onAnalyzeNow: () => void;
  onSymbolChange: (symbol: string) => void;
  onPaperTradingChange: (enabled: boolean) => void;
}

export const TradingControls = ({
  isRunning,
  isAnalyzing,
  isPaperTrading,
  selectedSymbol,
  symbols,
  onToggleRunning,
  onAnalyzeNow,
  onSymbolChange,
  onPaperTradingChange
}: TradingControlsProps) => {
  return (
    <div className="space-y-4">
      {/* Settings Row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label>Symbol:</Label>
          <Select value={selectedSymbol} onValueChange={onSymbolChange} disabled={isRunning}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {symbols.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch 
            id="paper-mode" 
            checked={isPaperTrading} 
            onCheckedChange={onPaperTradingChange}
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
          onClick={onAnalyzeNow}
          disabled={isAnalyzing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
          Analyze Now
        </Button>

        <Button
          variant={isRunning ? 'destructive' : 'default'}
          onClick={onToggleRunning}
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

      {!isPaperTrading && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <span className="text-sm text-yellow-600 dark:text-yellow-400">
            Live trading enabled - real funds will be used when you approve orders
          </span>
        </div>
      )}
    </div>
  );
};
