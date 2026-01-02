import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Key, Brain, Sparkles, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvestmentAIConnectorConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

const AI_PROVIDERS = [
  {
    id: 'aladdin',
    name: 'BlackRock Aladdin',
    description: 'Portfolio analysis, risk management, and trade signals',
    icon: Brain,
    capabilities: ['portfolio-analysis', 'risk-scoring', 'trade-signals', 'market-predictions'],
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    description: 'Advanced market analysis and strategy generation',
    icon: Sparkles,
    capabilities: ['market-analysis', 'strategy-generation', 'sentiment-detection', 'report-generation'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Investment research and risk evaluation',
    icon: Bot,
    capabilities: ['investment-research', 'risk-evaluation', 'regulatory-analysis', 'due-diligence'],
  },
];

const CAPABILITY_LABELS: Record<string, string> = {
  'portfolio-analysis': 'Portfolio Analysis',
  'risk-scoring': 'Risk Scoring',
  'trade-signals': 'Trade Signals',
  'market-predictions': 'Market Predictions',
  'market-analysis': 'Market Analysis',
  'strategy-generation': 'Strategy Generation',
  'sentiment-detection': 'Sentiment Detection',
  'report-generation': 'Report Generation',
  'investment-research': 'Investment Research',
  'risk-evaluation': 'Risk Evaluation',
  'regulatory-analysis': 'Regulatory Analysis',
  'due-diligence': 'Due Diligence',
};

export const InvestmentAIConnectorConfig = ({ config, onChange }: InvestmentAIConnectorConfigProps) => {
  const { toast } = useToast();
  const [configuredProviders, setConfiguredProviders] = useState<Record<string, boolean>>({});
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');

  useEffect(() => {
    checkConfiguredProviders();
  }, []);

  const checkConfiguredProviders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: keys } = await supabase
      .from('api_provider_keys')
      .select('provider, is_active')
      .eq('user_id', user.id);

    const providers: Record<string, boolean> = {};
    keys?.forEach(key => {
      providers[key.provider] = key.is_active ?? false;
    });
    setConfiguredProviders(providers);
  };

  const selectedProvider = AI_PROVIDERS.find(p => p.id === config.provider);

  const handleSaveApiKey = async () => {
    if (!config.provider || !newApiKey) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save API keys",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('api_provider_keys')
        .upsert({
          user_id: user.id,
          provider: config.provider,
          api_key_encrypted: newApiKey, // In production, encrypt this
          is_active: true,
        }, {
          onConflict: 'user_id,provider'
        });

      if (error) throw error;

      toast({
        title: "API Key Saved",
        description: `${selectedProvider?.name} API key has been configured`,
      });

      setNewApiKey('');
      setIsAddingKey(false);
      checkConfiguredProviders();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div className="space-y-2">
        <Label>AI Provider</Label>
        <Select
          value={config.provider || ''}
          onValueChange={(value) => onChange({ ...config, provider: value, capability: '' })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select AI provider" />
          </SelectTrigger>
          <SelectContent>
            {AI_PROVIDERS.map((provider) => {
              const Icon = provider.icon;
              const isConfigured = configuredProviders[provider.id];
              return (
                <SelectItem key={provider.id} value={provider.id}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{provider.name}</span>
                    {isConfigured ? (
                      <CheckCircle className="w-3 h-3 text-green-500 ml-2" />
                    ) : (
                      <XCircle className="w-3 h-3 text-muted-foreground ml-2" />
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Provider Details */}
      {selectedProvider && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <selectedProvider.icon className="w-5 h-5" />
                <CardTitle className="text-base">{selectedProvider.name}</CardTitle>
              </div>
              {configuredProviders[selectedProvider.id] ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                  <Key className="w-3 h-3 mr-1" />
                  Key Required
                </Badge>
              )}
            </div>
            <CardDescription>{selectedProvider.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* API Key Configuration */}
            {!configuredProviders[selectedProvider.id] && (
              <div className="space-y-3">
                {isAddingKey ? (
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Enter API key"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveApiKey} disabled={!newApiKey}>
                        Save Key
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsAddingKey(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsAddingKey(true)}
                    className="w-full"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Add API Key
                  </Button>
                )}
              </div>
            )}

            {/* Capability Selection */}
            <div className="space-y-2">
              <Label>Capability</Label>
              <Select
                value={config.capability || ''}
                onValueChange={(value) => onChange({ ...config, capability: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select capability" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider.capabilities.map((capability) => (
                    <SelectItem key={capability} value={capability}>
                      {CAPABILITY_LABELS[capability]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Symbols */}
      <div className="space-y-2">
        <Label>Symbols to Analyze</Label>
        <Input
          value={config.symbols || ''}
          onChange={(e) => onChange({ ...config, symbols: e.target.value })}
          placeholder="BTC/USDT, ETH/USDT"
        />
        <p className="text-xs text-muted-foreground">Comma-separated list of trading pairs</p>
      </div>

      {/* Custom Instructions */}
      <div className="space-y-2">
        <Label>Custom Instructions</Label>
        <Textarea
          value={config.customInstructions || ''}
          onChange={(e) => onChange({ ...config, customInstructions: e.target.value })}
          placeholder="Provide specific analysis requirements, risk parameters, or focus areas..."
          rows={4}
        />
      </div>

      {/* Output Format */}
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
            <SelectItem value="narrative">Narrative Report</SelectItem>
            <SelectItem value="signals">Trading Signals Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
