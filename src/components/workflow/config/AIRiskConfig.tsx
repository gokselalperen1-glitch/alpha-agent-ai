import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

interface AIRiskConfigProps {
  config: any;
  onUpdate: (config: any) => void;
}

const AI_MODELS = {
  "google/gemini-2.5-flash": "Gemini 2.5 Flash (Fast & Balanced)",
  "google/gemini-2.5-pro": "Gemini 2.5 Pro (Most Accurate)",
  "openai/gpt-5-mini": "GPT-5 Mini (Cost-Effective)",
  "openai/gpt-5": "GPT-5 (Powerful)",
};

export const AIRiskConfig = ({ config, onUpdate }: AIRiskConfigProps) => {
  const [model, setModel] = useState(config.model || "google/gemini-2.5-flash");
  const [riskTolerance, setRiskTolerance] = useState(config.riskTolerance || "moderate");
  const [confidenceThreshold, setConfidenceThreshold] = useState<number[]>([config.confidenceThreshold || 70]);
  const [customPrompt, setCustomPrompt] = useState(config.customPrompt || "");

  useEffect(() => {
    onUpdate({
      model,
      riskTolerance,
      confidenceThreshold: confidenceThreshold[0],
      customPrompt,
    });
  }, [model, riskTolerance, confidenceThreshold, customPrompt]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>AI Model</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(AI_MODELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Risk Tolerance</Label>
        <Select value={riskTolerance} onValueChange={setRiskTolerance}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="conservative">Conservative</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="aggressive">Aggressive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Confidence Threshold: {confidenceThreshold[0]}%</Label>
        <Slider
          value={confidenceThreshold}
          onValueChange={setConfidenceThreshold}
          min={0}
          max={100}
          step={5}
          className="py-4"
        />
        <p className="text-xs text-muted-foreground">
          Minimum confidence required to proceed with recommendations
        </p>
      </div>

      <div className="space-y-2">
        <Label>Custom Instructions (Optional)</Label>
        <Textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="e.g., Focus on technical indicators, avoid high volatility assets..."
          rows={4}
        />
      </div>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          AI will analyze market data and provide risk assessment based on your settings
        </p>
      </div>
    </div>
  );
};
