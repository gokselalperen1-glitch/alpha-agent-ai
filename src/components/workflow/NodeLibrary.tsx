import { NodeType, NODE_DEFINITIONS, NODE_CATEGORIES } from '@/types/workflow';
import { Activity, Database, Brain, TrendingUp, Bell, GitBranch, LineChart, MessageSquare, Newspaper, BarChart3, Sparkles, Link2, Cpu, CheckCircle, Key } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

// Free AI nodes - no API key needed
const FREE_AI_NODES: NodeType[] = ['ai-connector', 'ai-risk-assessment', 'sentiment-analysis'];
// API required - user enters key in node config
const API_REQUIRED_NODES: NodeType[] = ['investment-ai'];

const CATEGORY_LABELS: Record<string, string> = {
  triggers: '⏰ Triggers',
  data: '📊 Data Sources',
  analysis: '🧠 AI Analysis',
  actions: '⚡ Actions',
  logic: '🔀 Logic',
};

interface NodeLibraryProps {
  onNodeDragStart: (event: React.DragEvent, nodeType: NodeType) => void;
}

export const NodeLibrary = ({ onNodeDragStart }: NodeLibraryProps) => {
  const getNodeBadge = (nodeType: NodeType) => {
    if (FREE_AI_NODES.includes(nodeType)) {
      return (
        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
          Free AI
        </Badge>
      );
    }
    if (API_REQUIRED_NODES.includes(nodeType)) {
      return (
        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
          <Key className="w-2.5 h-2.5 mr-0.5" />
          API Key
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="w-56 border-r border-border bg-sidebar p-3 overflow-y-auto">
      <h3 className="font-semibold text-sidebar-foreground mb-3 text-sm">Node Library</h3>
      <p className="text-xs text-muted-foreground mb-4">Drag nodes to the canvas</p>
      
      {Object.entries(NODE_CATEGORIES).map(([category, nodeTypes]) => (
        <div key={category} className="mb-5">
          <h4 className="text-xs font-medium text-sidebar-foreground/70 mb-2">
            {CATEGORY_LABELS[category] || category}
          </h4>
          <div className="space-y-1.5">
            {nodeTypes.map((nodeType) => {
              const definition = NODE_DEFINITIONS[nodeType];
              const Icon = iconMap[nodeType];
              const badge = getNodeBadge(nodeType);
              
              return (
                <Card
                  key={nodeType}
                  draggable
                  onDragStart={(e) => onNodeDragStart(e, nodeType)}
                  className="p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start gap-2">
                    <div 
                      className="p-1 rounded shrink-0" 
                      style={{ backgroundColor: definition.color, opacity: 0.15 }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: definition.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs text-card-foreground truncate">
                        {definition.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {definition.description}
                      </div>
                      {badge && <div className="mt-1">{badge}</div>}
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
