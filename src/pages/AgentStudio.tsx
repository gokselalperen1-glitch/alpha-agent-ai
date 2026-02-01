import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Play, Pause, Plus, Trash2, Brain, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'error';
  is_paper_trading: boolean;
  created_at: string;
}

const AgentStudio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
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
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const loadAgents = async (userId: string) => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setAgents(data);
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

  const deleteAgent = async (agent: Agent) => {
    if (!confirm(`Delete "${agent.name}"? This cannot be undone.`)) return;

    const { error } = await supabase.from('agents').delete().eq('id', agent.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete agent', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: `${agent.name} has been deleted` });
      await loadAgents(user!.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
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
              Agent Studio
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your trading agents
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/trading')} className="gap-2">
              <Brain className="h-4 w-4" />
              AI Trading
            </Button>
            <Button onClick={() => navigate('/agent-builder')} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Agent
            </Button>
          </div>
        </div>

        {/* Agent List */}
        {agents.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No agents yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first trading agent or try the AI Trading feature
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate('/trading')}>
                  <Brain className="h-4 w-4 mr-2" />
                  Try AI Trading
                </Button>
                <Button onClick={() => navigate('/agent-builder')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {agent.description || 'No description'}
                      </CardDescription>
                    </div>
                    <Badge className={statusColors[agent.status]}>
                      {agent.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Badge variant="outline" className="text-xs">
                    {agent.is_paper_trading ? '📝 Paper' : '💰 Live'}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/agent-builder/${agent.id}`)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant={agent.status === 'active' ? 'destructive' : 'default'}
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleAgentStatus(agent)}
                      disabled={isActivating === agent.id}
                    >
                      {agent.status === 'active' ? (
                        <><Pause className="h-4 w-4 mr-1" />Pause</>
                      ) : (
                        <><Play className="h-4 w-4 mr-1" />Start</>
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteAgent(agent)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AgentStudio;
