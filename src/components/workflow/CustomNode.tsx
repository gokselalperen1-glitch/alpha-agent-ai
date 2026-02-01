import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { AgentNodeData, NODE_DEFINITIONS, NodeType } from '@/types/workflow';
import { Activity, Database, Brain, TrendingUp, Bell, GitBranch, LineChart, MessageSquare, Newspaper, BarChart3, Sparkles, Link2, Cpu } from 'lucide-react';

const iconMap: Record<NodeType, any> = {
  'schedule-trigger': Activity,
  'market-data': Database,
  'portfolio-connector': Link2,
  'technical-indicators': LineChart,
  'sentiment-analysis': MessageSquare,
  'news-monitor': Newspaper,
  'fundamental-analysis': BarChart3,
  'ai-connector': Sparkles,
  'investment-ai': Cpu,
  'ai-risk-assessment': Brain,
  'execute-trade': TrendingUp,
  'send-alert': Bell,
  'if-condition': GitBranch,
};

export const CustomNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as AgentNodeData;
  const definition = NODE_DEFINITIONS[nodeData.type];
  const Icon = iconMap[nodeData.type];

  return (
    <div 
      className={`
        relative px-4 py-3 rounded-lg border-2 bg-card min-w-[200px]
        transition-all duration-200 shadow-soft hover:shadow-medium
        ${selected ? 'border-ring shadow-glow' : 'border-border'}
      `}
    >
      <Handle 
        type="target" 
        position={Position.Top}
        className="!bg-secondary !w-3 !h-3 !border-2 !border-background"
      />
      
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="p-1.5 rounded" 
          style={{ backgroundColor: definition.color, opacity: 0.15 }}
        >
          <Icon className="w-4 h-4" style={{ color: definition.color }} />
        </div>
        <div className="font-semibold text-sm text-foreground">{nodeData.label}</div>
      </div>
      
      <div className="text-xs text-muted-foreground">{definition.description}</div>
      
      <Handle 
        type="source" 
        position={Position.Bottom}
        className="!bg-secondary !w-3 !h-3 !border-2 !border-background"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';
