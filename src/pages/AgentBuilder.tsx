import { useCallback, useRef, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from '@/components/workflow/CustomNode';
import { NodeLibrary } from '@/components/workflow/NodeLibrary';
import { NodeConfigPanel } from '@/components/workflow/NodeConfigPanel';
import { AIWorkflowGenerator } from '@/components/workflow/AIWorkflowGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Play, ArrowLeft, Sparkles } from 'lucide-react';
import { NodeType, AgentNodeData, NODE_DEFINITIONS } from '@/types/workflow';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowExecution } from '@/hooks/useWorkflowExecution';
import { supabase } from '@/integrations/supabase/client';

const nodeTypes = {
  'schedule-trigger': CustomNode,
  'market-data': CustomNode,
  'technical-indicators': CustomNode,
  'sentiment-analysis': CustomNode,
  'news-monitor': CustomNode,
  'fundamental-analysis': CustomNode,
  'ai-risk-assessment': CustomNode,
  'ai-connector': CustomNode,
  'portfolio-connector': CustomNode,
  'investment-ai': CustomNode,
  'execute-trade': CustomNode,
  'send-alert': CustomNode,
  'if-condition': CustomNode,
};

const AgentBuilderContent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const { executeWorkflow, isExecuting } = useWorkflowExecution();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflowName, setWorkflowName] = useState('Untitled Agent');
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadWorkflow(id);
    }
  }, [id]);

  const loadWorkflow = async (agentId: string) => {
    try {
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (agentError) throw agentError;
      
      setWorkflowName(agent.name);

      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .select('*')
        .eq('agent_id', agentId)
        .single();

      if (workflowError) throw workflowError;

      if (workflow.nodes) setNodes(workflow.nodes as any[]);
      if (workflow.edges) setEdges(workflow.edges as any[]);
    } catch (error: any) {
      console.error('Error loading workflow:', error);
      toast({
        title: "Error",
        description: "Failed to load workflow",
        variant: "destructive",
      });
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const updateNodeConfig = useCallback((nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!type || !reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const definition = NODE_DEFINITIONS[type];
      const newNode: Node<AgentNodeData> = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: definition.label,
          type,
          config: {},
          description: definition.description,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeDragStart = useCallback((event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to save",
          variant: "destructive",
        });
        return;
      }

      // First, create or update an agent
      let agentId = id;
      
      if (!agentId) {
        const { data: agentData, error: agentError } = await supabase
          .from('agents')
          .insert([{
            name: workflowName,
            description: 'AI trading agent',
            user_id: user.id,
            status: 'draft',
          }])
          .select()
          .single();

        if (agentError) {
          console.error('Agent creation error:', agentError);
          throw agentError;
        }
        agentId = agentData.id;
      } else {
        // Update agent name
        const { error: updateError } = await supabase
          .from('agents')
          .update({ name: workflowName })
          .eq('id', agentId);
        
        if (updateError) {
          console.error('Agent update error:', updateError);
        }
      }

      // Check if workflow already exists for this agent
      const { data: existingWorkflow, error: fetchError } = await supabase
        .from('workflows')
        .select('id')
        .eq('agent_id', agentId)
        .maybeSingle();

      if (fetchError) {
        console.error('Workflow fetch error:', fetchError);
      }

      // Save workflow - insert or update based on existence
      if (existingWorkflow) {
        // Update existing workflow
        const { error: workflowError } = await supabase
          .from('workflows')
          .update({
            nodes: nodes,
            edges: edges,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingWorkflow.id);

        if (workflowError) {
          console.error('Workflow update error:', workflowError);
          throw workflowError;
        }
      } else {
        // Create new workflow
        const { error: workflowError } = await supabase
          .from('workflows')
          .insert({
            agent_id: agentId,
            nodes: nodes,
            edges: edges,
          });

        if (workflowError) {
          console.error('Workflow insert error:', workflowError);
          throw workflowError;
        }
      }
      
      toast({ 
        title: "Saved", 
        description: id ? "Workflow updated successfully" : "Agent created with workflow" 
      });
      
      if (!id) {
        navigate(`/agent-builder/${agentId}`);
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!id) {
      toast({
        title: "Save First",
        description: "Please save your workflow before testing",
        variant: "destructive",
      });
      return;
    }

    const result = await executeWorkflow(id, { nodes, edges });
    
    if (result.success) {
      console.log('Execution result:', result.outputs);
    }
  };

  const loadDemoWorkflow = () => {
    const demoNodes: Node[] = [
      {
        id: 'demo-1',
        type: 'schedule-trigger',
        position: { x: 100, y: 50 },
        data: {
          type: 'schedule-trigger',
          label: 'Schedule Trigger',
          config: {
            cronExpression: '0 * * * *',
            timezone: 'UTC',
            description: 'Runs every hour',
          },
        },
      },
      {
        id: 'demo-2',
        type: 'market-data',
        position: { x: 100, y: 200 },
        data: {
          type: 'market-data',
          label: 'Market Data',
          config: {
            symbols: ['BTC/USDT', 'ETH/USDT'],
            timeframe: '1h',
          },
        },
      },
      {
        id: 'demo-3',
        type: 'technical-indicators',
        position: { x: 100, y: 350 },
        data: {
          type: 'technical-indicators',
          label: 'Technical Indicators',
          config: {
            symbol: 'BTC/USDT',
            indicator: 'RSI',
            interval: '1h',
            time_period: 14,
          },
        },
      },
      {
        id: 'demo-4',
        type: 'sentiment-analysis',
        position: { x: 450, y: 200 },
        data: {
          type: 'sentiment-analysis',
          label: 'Sentiment Analysis',
          config: {
            symbol: 'BTC',
            source: 'stocktwits',
            lookbackPeriod: 24,
            threshold: 0.5,
          },
        },
      },
      {
        id: 'demo-5',
        type: 'news-monitor',
        position: { x: 450, y: 350 },
        data: {
          type: 'news-monitor',
          label: 'News Monitor',
          config: {
            keywords: ['Bitcoin', 'BTC', 'cryptocurrency'],
            sources: ['all'],
            lookbackHours: 24,
            sentimentFilter: 'all',
          },
        },
      },
      {
        id: 'demo-6',
        type: 'ai-risk-assessment',
        position: { x: 275, y: 500 },
        data: {
          type: 'ai-risk-assessment',
          label: 'AI Risk Assessment',
          config: {
            model: 'google/gemini-2.5-flash',
            riskTolerance: 'moderate',
            confidenceThreshold: 70,
            customPrompt: 'Analyze technical indicators, sentiment, and news to assess trading risk. Focus on BTC/USDT trading opportunities.',
          },
        },
      },
      {
        id: 'demo-7',
        type: 'if-condition',
        position: { x: 275, y: 680 },
        data: {
          type: 'if-condition',
          label: 'Trading Condition',
          config: {
            conditions: [
              { field: 'riskScore', operator: '<', value: '30' },
              { field: 'sentiment', operator: '>', value: '0.5' },
            ],
            logic: 'AND',
          },
        },
      },
      {
        id: 'demo-8',
        type: 'execute-trade',
        position: { x: 275, y: 830 },
        data: {
          type: 'execute-trade',
          label: 'Execute Trade',
          config: {
            action: 'buy',
            symbol: 'BTC/USDT',
            amount: 0.001,
            orderType: 'market',
          },
        },
      },
      {
        id: 'demo-9',
        type: 'send-alert',
        position: { x: 275, y: 980 },
        data: {
          type: 'send-alert',
          label: 'Send Alert',
          config: {
            alertType: 'trade_executed',
            message: 'Demo strategy executed a BTC buy trade',
            severity: 'info',
          },
        },
      },
    ];

    const demoEdges: Edge[] = [
      { id: 'e1-2', source: 'demo-1', target: 'demo-2', animated: true },
      { id: 'e2-3', source: 'demo-2', target: 'demo-3', animated: true },
      { id: 'e2-4', source: 'demo-2', target: 'demo-4', animated: true },
      { id: 'e2-5', source: 'demo-2', target: 'demo-5', animated: true },
      { id: 'e3-6', source: 'demo-3', target: 'demo-6', animated: true },
      { id: 'e4-6', source: 'demo-4', target: 'demo-6', animated: true },
      { id: 'e5-6', source: 'demo-5', target: 'demo-6', animated: true },
      { id: 'e6-7', source: 'demo-6', target: 'demo-7', animated: true },
      { id: 'e7-8', source: 'demo-7', target: 'demo-8', animated: true, label: 'true' },
      { id: 'e8-9', source: 'demo-8', target: 'demo-9', animated: true },
    ];

    setNodes(demoNodes);
    setEdges(demoEdges);
    setWorkflowName('Demo: BTC Trading Strategy');
    
    toast({
      title: "Demo Loaded",
      description: "Example workflow with all investment analysis nodes loaded",
    });
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/agent-studio')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="max-w-xs"
            placeholder="Agent name..."
          />
        </div>
        <div className="flex items-center gap-2">
          <AIWorkflowGenerator 
            onWorkflowGenerated={(workflow) => {
              setNodes(workflow.nodes);
              setEdges(workflow.edges);
            }}
          />
          <Button variant="secondary" size="sm" onClick={loadDemoWorkflow}>
            <Sparkles className="w-4 h-4 mr-2" />
            Demo
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTest}
            disabled={isExecuting || !id}
          >
            <Play className="w-4 h-4 mr-2" />
            {isExecuting ? 'Testing...' : 'Test'}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Node Library */}
        <NodeLibrary onNodeDragStart={onNodeDragStart} />
        
        {/* Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Right Panel - Node Config */}
        {selectedNodeId && selectedNode && (
          <NodeConfigPanel
            nodeId={selectedNodeId}
            nodeData={selectedNode.data as AgentNodeData}
            onClose={() => setSelectedNodeId(null)}
            onUpdate={updateNodeConfig}
          />
        )}
      </div>
    </div>
  );
};

const AgentBuilder = () => {
  return (
    <ReactFlowProvider>
      <AgentBuilderContent />
    </ReactFlowProvider>
  );
};

export default AgentBuilder;
