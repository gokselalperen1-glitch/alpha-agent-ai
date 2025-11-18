import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface Condition {
  variable: string;
  operator: string;
  value: string;
}

interface ConditionConfigProps {
  config: any;
  onUpdate: (config: any) => void;
}

const OPERATORS = [
  { value: ">", label: "Greater than (>)" },
  { value: ">=", label: "Greater or equal (>=)" },
  { value: "<", label: "Less than (<)" },
  { value: "<=", label: "Less or equal (<=)" },
  { value: "==", label: "Equals (==)" },
  { value: "!=", label: "Not equals (!=)" },
  { value: "contains", label: "Contains" },
];

const LOGIC_OPERATORS = [
  { value: "AND", label: "AND (all must be true)" },
  { value: "OR", label: "OR (any can be true)" },
];

export const ConditionConfig = ({ config, onUpdate }: ConditionConfigProps) => {
  const [conditions, setConditions] = useState<Condition[]>(
    config.conditions || [{ variable: "", operator: ">", value: "" }]
  );
  const [logicOperator, setLogicOperator] = useState(config.logicOperator || "AND");

  useEffect(() => {
    onUpdate({
      conditions,
      logicOperator,
    });
  }, [conditions, logicOperator]);

  const addCondition = () => {
    setConditions([...conditions, { variable: "", operator: ">", value: "" }]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const updateCondition = (index: number, field: keyof Condition, value: string) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  return (
    <div className="space-y-4">
      {conditions.length > 1 && (
        <div className="space-y-2">
          <Label>Logic</Label>
          <Select value={logicOperator} onValueChange={setLogicOperator}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOGIC_OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-3">
        {conditions.map((condition, index) => (
          <div key={index} className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Condition {index + 1}</Label>
              {conditions.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeCondition(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Input
                value={condition.variable}
                onChange={(e) => updateCondition(index, "variable", e.target.value)}
                placeholder="e.g., price, rsi, confidence"
              />

              <Select
                value={condition.operator}
                onValueChange={(value) => updateCondition(index, "operator", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={condition.value}
                onChange={(e) => updateCondition(index, "value", e.target.value)}
                placeholder="Value to compare"
              />
            </div>
          </div>
        ))}
      </div>

      <Button onClick={addCondition} variant="outline" size="sm" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Condition
      </Button>

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Available variables from previous nodes: price, volume, rsi, confidence, risk_level
        </p>
      </div>
    </div>
  );
};
