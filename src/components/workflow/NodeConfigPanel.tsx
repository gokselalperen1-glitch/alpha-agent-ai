import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NodeType, AgentNodeData } from "@/types/workflow";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScheduleTriggerConfig } from "./config/ScheduleTriggerConfig";
import { MarketDataConfig } from "./config/MarketDataConfig";
import { AIRiskConfig } from "./config/AIRiskConfig";
import { ExecuteTradeConfig } from "./config/ExecuteTradeConfig";
import { SendAlertConfig } from "./config/SendAlertConfig";
import { ConditionConfig } from "./config/ConditionConfig";

interface NodeConfigPanelProps {
  nodeId: string;
  nodeData: AgentNodeData;
  onClose: () => void;
  onUpdate: (nodeId: string, config: any) => void;
}

export const NodeConfigPanel = ({ nodeId, nodeData, onClose, onUpdate }: NodeConfigPanelProps) => {
  const handleConfigUpdate = (config: any) => {
    onUpdate(nodeId, config);
  };

  const renderConfigForm = () => {
    switch (nodeData.type) {
      case 'schedule-trigger':
        return <ScheduleTriggerConfig config={nodeData.config} onUpdate={handleConfigUpdate} />;
      case 'market-data':
        return <MarketDataConfig config={nodeData.config} onUpdate={handleConfigUpdate} />;
      case 'ai-risk-assessment':
        return <AIRiskConfig config={nodeData.config} onUpdate={handleConfigUpdate} />;
      case 'execute-trade':
        return <ExecuteTradeConfig config={nodeData.config} onUpdate={handleConfigUpdate} />;
      case 'send-alert':
        return <SendAlertConfig config={nodeData.config} onUpdate={handleConfigUpdate} />;
      case 'if-condition':
        return <ConditionConfig config={nodeData.config} onUpdate={handleConfigUpdate} />;
      default:
        return <div className="text-muted-foreground">No configuration available</div>;
    }
  };

  return (
    <Card className="w-80 h-full overflow-y-auto border-l">
      <CardHeader className="sticky top-0 bg-card z-10 border-b">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{nodeData.label}</CardTitle>
            <CardDescription className="text-xs mt-1">{nodeData.description}</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {renderConfigForm()}
      </CardContent>
    </Card>
  );
};
