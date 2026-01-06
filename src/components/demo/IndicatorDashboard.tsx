import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Activity, BarChart3, Target } from 'lucide-react';

interface IndicatorVotes {
  rsi: -1 | 0 | 1;
  macd: -1 | 0 | 1;
  trend: -1 | 0 | 1;
  bollinger: -1 | 0 | 1;
  momentum: -1 | 0 | 1;
  totalScore: number;
}

interface RiskMetrics {
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  positionSizeMultiplier: number;
  volatilityLevel: 'low' | 'medium' | 'high';
}

interface IndicatorData {
  rsi: number;
  sma20: number;
  bollingerUpper: number;
  bollingerLower: number;
  bollingerPercentB: number;
  macdHistogram: number;
  atr: number;
  high20: number;
  low20: number;
  price: number;
}

interface IndicatorDashboardProps {
  indicators: IndicatorData;
  votes: IndicatorVotes;
  riskMetrics: RiskMetrics;
  className?: string;
}

const VoteIcon = ({ vote }: { vote: -1 | 0 | 1 }) => {
  if (vote === 1) return <TrendingUp className="h-3 w-3 text-green-500" />;
  if (vote === -1) return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

const RSIGauge = ({ value }: { value: number }) => {
  const getColor = () => {
    if (value < 30) return 'text-green-500';
    if (value > 70) return 'text-red-500';
    return 'text-muted-foreground';
  };
  
  const getZone = () => {
    if (value < 30) return 'Oversold';
    if (value > 70) return 'Overbought';
    return 'Neutral';
  };
  
  // Position on a 0-100 scale
  const position = Math.min(100, Math.max(0, value));
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">RSI</span>
        <span className={cn("font-medium", getColor())}>{value.toFixed(1)}</span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="w-[30%] bg-green-500/30" />
          <div className="w-[40%] bg-muted" />
          <div className="w-[30%] bg-red-500/30" />
        </div>
        <div 
          className={cn("absolute h-3 w-1 -top-0.5 rounded-full", getColor().replace('text-', 'bg-'))}
          style={{ left: `calc(${position}% - 2px)` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground text-center">{getZone()}</p>
    </div>
  );
};

const BollingerGauge = ({ percentB }: { percentB: number }) => {
  const getColor = () => {
    if (percentB < 0.2) return 'text-green-500';
    if (percentB > 0.8) return 'text-red-500';
    return 'text-muted-foreground';
  };
  
  const position = Math.min(100, Math.max(0, percentB * 100));
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Bollinger %B</span>
        <span className={cn("font-medium", getColor())}>{(percentB * 100).toFixed(1)}%</span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="w-[20%] bg-green-500/30" />
          <div className="w-[60%] bg-muted" />
          <div className="w-[20%] bg-red-500/30" />
        </div>
        <div 
          className={cn("absolute h-3 w-1 -top-0.5 rounded-full", getColor().replace('text-', 'bg-'))}
          style={{ left: `calc(${position}% - 2px)` }}
        />
      </div>
    </div>
  );
};

const MACDBar = ({ histogram }: { histogram: number }) => {
  const isPositive = histogram > 0;
  const maxBar = 500; // Normalize to reasonable scale
  const barWidth = Math.min(100, Math.abs(histogram) / maxBar * 100);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">MACD Histogram</span>
        <span className={cn("font-medium", isPositive ? "text-green-500" : "text-red-500")}>
          {histogram.toFixed(2)}
        </span>
      </div>
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div className="absolute inset-0 flex items-center">
          <div className="w-1/2" />
          <div className="w-0.5 h-full bg-border" />
          <div className="w-1/2" />
        </div>
        {isPositive ? (
          <div 
            className="absolute h-full bg-green-500/60 rounded-r-full"
            style={{ left: '50%', width: `${barWidth / 2}%` }}
          />
        ) : (
          <div 
            className="absolute h-full bg-red-500/60 rounded-l-full"
            style={{ right: '50%', width: `${barWidth / 2}%` }}
          />
        )}
      </div>
    </div>
  );
};

export const IndicatorDashboard = ({ indicators, votes, riskMetrics, className }: IndicatorDashboardProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      {/* Indicator Gauges */}
      <div className="space-y-2">
        <RSIGauge value={indicators.rsi} />
        <BollingerGauge percentB={indicators.bollingerPercentB} />
        <MACDBar histogram={indicators.macdHistogram} />
      </div>
      
      {/* Consensus Votes */}
      <div className="bg-muted/30 rounded-lg p-2">
        <div className="flex items-center gap-1 mb-2">
          <Activity className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">Indicator Votes</span>
          <span className={cn(
            "ml-auto text-xs font-bold",
            votes.totalScore > 0 ? "text-green-500" : votes.totalScore < 0 ? "text-red-500" : "text-muted-foreground"
          )}>
            {votes.totalScore > 0 ? '+' : ''}{votes.totalScore}/5
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {[
            { name: 'RSI', vote: votes.rsi },
            { name: 'MACD', vote: votes.macd },
            { name: 'Trend', vote: votes.trend },
            { name: 'BB', vote: votes.bollinger },
            { name: 'Mom', vote: votes.momentum },
          ].map(({ name, vote }) => (
            <div key={name} className="flex flex-col items-center gap-0.5 p-1 bg-muted/50 rounded">
              <VoteIcon vote={vote} />
              <span className="text-[9px] text-muted-foreground">{name}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Risk Metrics */}
      <div className="bg-muted/30 rounded-lg p-2">
        <div className="flex items-center gap-1 mb-2">
          <Target className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">Risk Management</span>
          <span className={cn(
            "ml-auto text-[10px] px-1.5 py-0.5 rounded",
            riskMetrics.volatilityLevel === 'high' ? "bg-red-500/20 text-red-500" :
            riskMetrics.volatilityLevel === 'medium' ? "bg-yellow-500/20 text-yellow-500" :
            "bg-green-500/20 text-green-500"
          )}>
            {riskMetrics.volatilityLevel.toUpperCase()} VOL
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground text-[10px]">Stop Loss</p>
            <p className="font-medium text-red-400">${riskMetrics.suggestedStopLoss.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Take Profit</p>
            <p className="font-medium text-green-400">${riskMetrics.suggestedTakeProfit.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-1">
          <BarChart3 className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Position Size: {(riskMetrics.positionSizeMultiplier * 100).toFixed(0)}% of base
          </span>
        </div>
      </div>
    </div>
  );
};
