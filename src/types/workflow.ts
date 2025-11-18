export type NodeType = 
  | 'schedule-trigger'
  | 'market-data'
  | 'technical-indicators'
  | 'sentiment-analysis'
  | 'news-monitor'
  | 'fundamental-analysis'
  | 'ai-risk-assessment'
  | 'execute-trade'
  | 'send-alert'
  | 'if-condition';

export interface NodeConfig {
  [key: string]: any;
}

export interface AgentNodeData extends Record<string, unknown> {
  label: string;
  type: NodeType;
  config: NodeConfig;
  description?: string;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: AgentNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  agent_id?: string;
}

export const NODE_CATEGORIES = {
  triggers: ['schedule-trigger'],
  data: ['market-data', 'technical-indicators', 'news-monitor', 'fundamental-analysis'],
  analysis: ['ai-risk-assessment', 'sentiment-analysis'],
  actions: ['execute-trade', 'send-alert'],
  logic: ['if-condition'],
} as const;

export const NODE_DEFINITIONS = {
  'schedule-trigger': {
    label: 'Schedule Trigger',
    description: 'Run workflow on a schedule',
    category: 'triggers',
    color: 'hsl(var(--accent))',
  },
  'market-data': {
    label: 'Market Data',
    description: 'Fetch real-time market data',
    category: 'data',
    color: 'hsl(var(--primary))',
  },
  'technical-indicators': {
    label: 'Technical Indicators',
    description: 'Calculate RSI, MACD, moving averages',
    category: 'data',
    color: 'hsl(var(--primary))',
  },
  'sentiment-analysis': {
    label: 'Sentiment Analysis',
    description: 'Analyze market sentiment from social media',
    category: 'analysis',
    color: 'hsl(var(--secondary))',
  },
  'news-monitor': {
    label: 'News Monitor',
    description: 'Track breaking financial news',
    category: 'data',
    color: 'hsl(var(--primary))',
  },
  'fundamental-analysis': {
    label: 'Fundamental Analysis',
    description: 'Analyze company fundamentals',
    category: 'data',
    color: 'hsl(var(--primary))',
  },
  'ai-risk-assessment': {
    label: 'AI Risk Analysis',
    description: 'Analyze risk using AI',
    category: 'analysis',
    color: 'hsl(var(--secondary))',
  },
  'execute-trade': {
    label: 'Execute Trade',
    description: 'Place a trade order',
    category: 'actions',
    color: 'hsl(215 45% 35%)',
  },
  'send-alert': {
    label: 'Send Alert',
    description: 'Send notification',
    category: 'actions',
    color: 'hsl(215 45% 35%)',
  },
  'if-condition': {
    label: 'Condition',
    description: 'Branch based on condition',
    category: 'logic',
    color: 'hsl(var(--muted-foreground))',
  },
} as const;
