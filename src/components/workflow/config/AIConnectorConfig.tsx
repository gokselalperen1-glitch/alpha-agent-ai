import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, Target, TrendingUp } from 'lucide-react';

interface AIConnectorConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

const AI_CAPABILITIES = [
  { 
    value: 'market-analysis', 
    label: 'Market Analysis', 
    description: 'Analyze market conditions and trends',
    icon: TrendingUp 
  },
  { 
    value: 'risk-scoring', 
    label: 'Risk Scoring', 
    description: 'Calculate risk scores for trades',
    icon: Target 
  },
  { 
    value: 'sentiment-detection', 
    label: 'Sentiment Detection', 
    description: 'Detect sentiment from news/social media',
    icon: Sparkles 
  },
  { 
    value: 'strategy-optimization', 
    label: 'Strategy Optimization', 
    description: 'Optimize trading strategy parameters',
    icon: Brain 
  },
];

const AI_MODELS = [
  { value: 'gemini-flash', label: 'Gemini Flash (Fast)', speed: 'fast', quality: 'good' },
  { value: 'gemini-pro', label: 'Gemini Pro (Balanced)', speed: 'medium', quality: 'excellent' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini (Efficient)', speed: 'fast', quality: 'good' },
  { value: 'gpt-5', label: 'GPT-5 (Premium)', speed: 'slower', quality: 'best' },
];

export const AIConnectorConfig = ({ config, onChange }: AIConnectorConfigProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>AI Capability</Label>
        <Select
          value={config.capability || 'market-analysis'}
          onValueChange={(value) => onChange({ ...config, capability: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select capability" />
          </SelectTrigger>
          <SelectContent>
            {AI_CAPABILITIES.map(cap => (
              <SelectItem key={cap.value} value={cap.value}>
                <div className="flex items-center gap-2">
                  <cap.icon className="h-4 w-4" />
                  <span>{cap.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {AI_CAPABILITIES.find(c => c.value === config.capability)?.description || 'Select a capability'}
        </p>
      </div>

      <div className="space-y-2">
        <Label>AI Model</Label>
        <Select
          value={config.model || 'gemini-flash'}
          onValueChange={(value) => onChange({ ...config, model: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {AI_MODELS.map(model => (
              <SelectItem key={model.value} value={model.value}>
                <div className="flex items-center gap-2">
                  <span>{model.label}</span>
                  <Badge variant="outline" className="text-xs">{model.speed}</Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="symbols">Symbols to Analyze</Label>
        <Input
          id="symbols"
          value={config.symbols || ''}
          onChange={(e) => onChange({ ...config, symbols: e.target.value })}
          placeholder="BTC, ETH, SOL (comma separated)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="context">Additional Context (Optional)</Label>
        <Textarea
          id="context"
          value={config.additionalContext || ''}
          onChange={(e) => onChange({ ...config, additionalContext: e.target.value })}
          placeholder="E.g., Focus on high volatility patterns, conservative risk tolerance..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Output Format</Label>
        <Select
          value={config.outputFormat || 'structured'}
          onValueChange={(value) => onChange({ ...config, outputFormat: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="structured">Structured JSON</SelectItem>
            <SelectItem value="summary">Summary Text</SelectItem>
            <SelectItem value="signals">Trading Signals</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 rounded-lg bg-accent/20 border border-accent/30">
        <p className="text-xs text-muted-foreground">
          <strong>Powered by Lovable AI</strong> — No API keys required. Uses your workspace's AI credits.
        </p>
      </div>
    </div>
  );
};
