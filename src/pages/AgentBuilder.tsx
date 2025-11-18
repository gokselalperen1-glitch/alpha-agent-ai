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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Play, ArrowLeft } from 'lucide-react';
import { NodeType, AgentNodeData, NODE_DEFINITIONS } from '@/types/workflow';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowExecution } from '@/hooks/useWorkflowExecution';
import { supabase } from '@/integrations/supabase/client';

const nodeTypes = {
  'schedule-trigger': CustomNode,
  'market-data': CustomNode,
  'ai-risk-assessment': CustomNode,
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

        if (agentError) throw agentError;
        agentId = agentData.id;
      } else {
        // Update agent name
        await supabase
          .from('agents')
          .update({ name: workflowName })
          .eq('id', agentId);
      }

      // Then save the workflow
      const workflow = {
        agent_id: agentId,
        nodes: nodes,
        edges: edges,
      };

      const { error } = await supabase
        .from('workflows')
        .upsert(workflow, { onConflict: 'agent_id' });

      if (error) throw error;
      
      toast({ 
        title: "Saved", 
        description: id ? "Workflow updated successfully" : "Workflow created successfully" 
      });
      
      if (!id) {
        navigate(`/agent-builder/${agentId}`);
      }
    } catch (error: any) {
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

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
          >
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTest}
            disabled={isExecuting || !id}
          >
            <Play className="w-4 h-4 mr-2" />
            {isExecuting ? 'Testing...' : 'Test'}
          </Button>
          <Button 
            size="sm" 
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <NodeLibrary onNodeDragStart={onNodeDragStart} />
        
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

        {selectedNodeId && (
          <NodeConfigPanel
            nodeId={selectedNodeId}
            nodeData={nodes.find(n => n.id === selectedNodeId)?.data as AgentNodeData}
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
