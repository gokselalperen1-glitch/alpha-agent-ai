import { NodeType, NODE_DEFINITIONS, NODE_CATEGORIES } from '@/types/workflow';
import { Activity, Database, Brain, TrendingUp, Bell, GitBranch, LineChart, MessageSquare, Newspaper, BarChart3, Sparkles, Link2, Cpu } from 'lucide-react';
import { Card } from '@/components/ui/card';

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

interface NodeLibraryProps {
  onNodeDragStart: (event: React.DragEvent, nodeType: NodeType) => void;
}

export const NodeLibrary = ({ onNodeDragStart }: NodeLibraryProps) => {
  return (
    <div className="w-64 border-r border-border bg-sidebar p-4 overflow-y-auto">
      <h3 className="font-semibold text-sidebar-foreground mb-4">Node Library</h3>
      
      {Object.entries(NODE_CATEGORIES).map(([category, nodeTypes]) => (
        <div key={category} className="mb-6">
          <h4 className="text-xs font-medium text-sidebar-foreground/60 uppercase mb-2">
            {category}
          </h4>
          <div className="space-y-2">
            {nodeTypes.map((nodeType) => {
              const definition = NODE_DEFINITIONS[nodeType];
              const Icon = iconMap[nodeType];
              
              return (
                <Card
                  key={nodeType}
                  draggable
                  onDragStart={(e) => onNodeDragStart(e, nodeType)}
                  className="p-3 cursor-grab active:cursor-grabbing hover:shadow-medium transition-shadow"
                >
                  <div className="flex items-start gap-2">
                    <div 
                      className="p-1.5 rounded mt-0.5" 
                      style={{ backgroundColor: definition.color, opacity: 0.15 }}
                    >
                      <Icon className="w-4 h-4" style={{ color: definition.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-card-foreground">
                        {definition.label}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {definition.description}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
