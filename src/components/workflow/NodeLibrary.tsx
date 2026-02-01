import { useState, useEffect } from 'react';
import { NodeType, NODE_DEFINITIONS, NODE_CATEGORIES } from '@/types/workflow';
import { supabase } from '@/integrations/supabase/client';
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

// Nodes that require external API keys
const API_REQUIRED_NODES: NodeType[] = ['investment-ai'];

// Nodes that work without any API key (using Lovable AI)
const FREE_AI_NODES: NodeType[] = ['ai-connector', 'ai-risk-assessment', 'sentiment-analysis'];

interface NodeLibraryProps {
  onNodeDragStart: (event: React.DragEvent, nodeType: NodeType) => void;
}

export const NodeLibrary = ({ onNodeDragStart }: NodeLibraryProps) => {
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);

  useEffect(() => {
    checkConfiguredProviders();
  }, []);

  const checkConfiguredProviders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: keys } = await supabase
      .from('api_provider_keys')
      .select('provider')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (keys) {
      setConfiguredProviders(keys.map(k => k.provider));
    }
  };

  const getNodeStatus = (nodeType: NodeType) => {
    if (FREE_AI_NODES.includes(nodeType)) {
      return { ready: true, label: 'Ready', icon: CheckCircle };
    }
    if (API_REQUIRED_NODES.includes(nodeType)) {
      const hasKey = configuredProviders.some(p => 
        ['aladdin', 'openai', 'anthropic'].includes(p)
      );
      return { 
        ready: hasKey, 
        label: hasKey ? 'Ready' : 'API Key Required',
        icon: hasKey ? CheckCircle : Key
      };
    }
    return { ready: true, label: null, icon: null };
  };

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
              const status = getNodeStatus(nodeType);
              
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
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-sm text-card-foreground">
                          {definition.label}
                        </span>
                        {status.icon && (
                          <status.icon className={`w-3 h-3 ${status.ready ? 'text-green-500' : 'text-amber-500'}`} />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {definition.description}
                      </div>
                      {FREE_AI_NODES.includes(nodeType) && (
                        <Badge variant="outline" className="text-[10px] mt-1 bg-green-500/10 text-green-600 border-green-500/20">
                          Free AI
                        </Badge>
                      )}
                      {API_REQUIRED_NODES.includes(nodeType) && !status.ready && (
                        <Badge variant="outline" className="text-[10px] mt-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                          Add key in config
                        </Badge>
                      )}
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
