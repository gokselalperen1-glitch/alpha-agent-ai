import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bot, Play, Pause, Plus, Activity, TrendingUp, 
  AlertTriangle, CheckCircle, Clock, Zap, BarChart3,
  RefreshCw, Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AgentStatusMonitor } from '@/components/studio/AgentStatusMonitor';
import { LiveTransactionFeed } from '@/components/studio/LiveTransactionFeed';
import { AgentPerformanceChart } from '@/components/studio/AgentPerformanceChart';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'error';
  is_paper_trading: boolean;
  created_at: string;
  updated_at: string;
}

interface ExecutionStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
}

const AgentStudio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [executionStats, setExecutionStats] = useState<ExecutionStats>({ total: 0, completed: 0, failed: 0, running: 0 });
  const [isActivating, setIsActivating] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
      await loadAgents(session.user.id);
      await loadExecutionStats(session.user.id);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const agentChannel = supabase
      .channel('agent-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'agents',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        loadAgents(user.id);
      })
      .subscribe();

    const executionChannel = supabase
      .channel('execution-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'executions',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        loadExecutionStats(user.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(agentChannel);
      supabase.removeChannel(executionChannel);
    };
  }, [user]);

  const loadAgents = async (userId: string) => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setAgents(data);
      if (!selectedAgent && data.length > 0) {
        setSelectedAgent(data[0]);
      }
    }
  };

  const loadExecutionStats = async (userId: string) => {
    const { data } = await supabase
      .from('executions')
      .select('status')
      .eq('user_id', userId);

    if (data) {
      setExecutionStats({
        total: data.length,
        completed: data.filter(e => e.status === 'completed').length,
        failed: data.filter(e => e.status === 'failed').length,
        running: data.filter(e => e.status === 'running').length,
      });
    }
  };

  const toggleAgentStatus = async (agent: Agent) => {
    setIsActivating(agent.id);
    const newStatus = agent.status === 'active' ? 'paused' : 'active';

    const { error } = await supabase
      .from('agents')
      .update({ status: newStatus })
      .eq('id', agent.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update agent status', variant: 'destructive' });
    } else {
      toast({ 
        title: newStatus === 'active' ? 'Agent Activated' : 'Agent Paused',
        description: `${agent.name} is now ${newStatus}`,
      });
      await loadAgents(user!.id);
    }
    setIsActivating(null);
  };

  const toggleTradingMode = async (agent: Agent) => {
    const newMode = !agent.is_paper_trading;
    
    if (!newMode) {
      // Switching to live trading - show warning
      const confirmed = window.confirm(
        '⚠️ Warning: You are about to enable LIVE trading.\n\n' +
        'Real funds will be used for transactions.\n' +
        'Make sure you have:\n' +
        '- Connected a valid exchange account\n' +
        '- Set appropriate risk limits\n' +
        '- Tested the agent in paper trading mode\n\n' +
        'Continue?'
      );
      if (!confirmed) return;
    }

    const { error } = await supabase
      .from('agents')
      .update({ is_paper_trading: newMode })
      .eq('id', agent.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update trading mode', variant: 'destructive' });
    } else {
      toast({
        title: newMode ? 'Paper Trading Enabled' : 'Live Trading Enabled',
        description: newMode 
          ? 'Agent will now execute simulated trades'
          : '⚠️ Agent will now execute real trades',
        variant: newMode ? 'default' : 'destructive',
      });
      await loadAgents(user!.id);
    }
  };

  const executeAgent = async (agent: Agent) => {
    try {
      // Get workflow data
      const { data: workflow } = await supabase
        .from('workflows')
        .select('nodes, edges')
        .eq('agent_id', agent.id)
        .single();

      if (!workflow) {
        toast({ title: 'Error', description: 'No workflow found for this agent', variant: 'destructive' });
        return;
      }

      const { data, error } = await supabase.functions.invoke('workflow-executor', {
        body: { agentId: agent.id, workflowData: workflow },
      });

      if (error) throw error;

      toast({
        title: 'Execution Started',
        description: `Execution ID: ${data.executionId}`,
      });
    } catch (error: any) {
      toast({ title: 'Execution Failed', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-green-500/20 text-green-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    error: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={user} />
      <main className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              AI Agent Studio
            </h1>
            <p className="text-muted-foreground mt-2">Create, monitor, and manage AI trading agents</p>
          </div>
          <Button onClick={() => navigate('/agent-builder')} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Agent
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Agents</p>
                  <p className="text-2xl font-bold">{agents.filter(a => a.status === 'active').length}</p>
                </div>
                <Zap className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Executions</p>
                  <p className="text-2xl font-bold">{executionStats.total}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">
                    {executionStats.total > 0 
                      ? Math.round((executionStats.completed / executionStats.total) * 100) 
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Running Now</p>
                  <p className="text-2xl font-bold">{executionStats.running}</p>
                </div>
                <RefreshCw className={`h-8 w-8 text-yellow-500 ${executionStats.running > 0 ? 'animate-spin' : ''}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Your Agents</CardTitle>
              <CardDescription>Select an agent to view details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {agents.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No agents created yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate('/agent-builder')}>
                    Create Your First Agent
                  </Button>
                </div>
              ) : (
                agents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedAgent?.id === agent.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedAgent(agent)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{agent.name}</h3>
                        <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {agent.description || 'No description'}
                        </p>
                      </div>
                      <Badge className={statusColors[agent.status]}>
                        {agent.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {agent.is_paper_trading ? '📝 Paper' : '💰 Live'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Agent Details & Controls */}
          <Card className="lg:col-span-2">
            {selectedAgent ? (
              <>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedAgent.name}
                        <Badge className={statusColors[selectedAgent.status]}>
                          {selectedAgent.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{selectedAgent.description || 'No description'}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/agent-builder/${selectedAgent.id}`)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant={selectedAgent.status === 'active' ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => toggleAgentStatus(selectedAgent)}
                        disabled={isActivating === selectedAgent.id}
                      >
                        {selectedAgent.status === 'active' ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => executeAgent(selectedAgent)}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Execute Now
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="status" className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="status" className="flex-1">Status</TabsTrigger>
                      <TabsTrigger value="transactions" className="flex-1">Transactions</TabsTrigger>
                      <TabsTrigger value="performance" className="flex-1">Performance</TabsTrigger>
                      <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="status" className="mt-4">
                      <AgentStatusMonitor agentId={selectedAgent.id} userId={user!.id} />
                    </TabsContent>

                    <TabsContent value="transactions" className="mt-4">
                      <LiveTransactionFeed agentId={selectedAgent.id} userId={user!.id} />
                    </TabsContent>

                    <TabsContent value="performance" className="mt-4">
                      <AgentPerformanceChart agentId={selectedAgent.id} userId={user!.id} />
                    </TabsContent>

                    <TabsContent value="settings" className="mt-4 space-y-6">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <Label className="text-base font-medium">Trading Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            {selectedAgent.is_paper_trading 
                              ? 'Paper trading - simulated transactions' 
                              : '⚠️ Live trading - real funds at risk'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Paper</Label>
                          <Switch
                            checked={!selectedAgent.is_paper_trading}
                            onCheckedChange={() => toggleTradingMode(selectedAgent)}
                          />
                          <Label className="text-sm">Live</Label>
                        </div>
                      </div>

                      {!selectedAgent.is_paper_trading && (
                        <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                            <div>
                              <h4 className="font-medium text-destructive">Live Trading Active</h4>
                              <p className="text-sm text-muted-foreground">
                                This agent will execute real trades using your connected exchange accounts. 
                                Ensure you have sufficient funds and appropriate risk management settings.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-16 text-center">
                <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Select an Agent</h3>
                <p className="text-muted-foreground">Choose an agent from the list to view its details and controls</p>
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AgentStudio;
