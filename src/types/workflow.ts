export type NodeType = 
  | 'schedule-trigger'
  | 'market-data'
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
  data: ['market-data'],
  analysis: ['ai-risk-assessment'],
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
