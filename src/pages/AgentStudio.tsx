import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Play, Pause, Plus, Trash2, Settings, Sparkles, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'error';
  is_paper_trading: boolean;
  created_at: string;
  updated_at: string;
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
        title: newStatus === 'active' ? 'Agent Started' : 'Agent Paused',
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

  const statusStyles: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    active: 'bg-green-500/20 text-green-500 border-green-500/30',
    paused: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    error: 'bg-red-500/20 text-red-500 border-red-500/30',
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={user} />
      <main className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bot className="h-6 w-6 text-primary" />
              My Agents
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Build and manage your trading agents
            </p>
          </div>
          <Button onClick={() => navigate('/agent-builder')} className="gap-2">
            <Plus className="h-4 w-4" />
            New Agent
          </Button>
        </div>

        {/* Quick Start */}
        {agents.length === 0 && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="py-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg font-semibold mb-2">Get Started in Minutes</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Create your first trading agent using our visual workflow builder. 
                    Use free AI nodes for market analysis or connect external APIs like Aladdin.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <Button onClick={() => navigate('/agent-builder')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Agent
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/trading')}>
                      Try AI Trading
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agent List */}
        {agents.length > 0 ? (
          <div className="space-y-3">
            {agents.map((agent) => (
              <Card key={agent.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Status Indicator */}
                    <div className={`w-2 h-2 rounded-full ${agent.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                    
                    {/* Agent Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{agent.name}</h3>
                        <Badge variant="outline" className={statusStyles[agent.status]}>
                          {agent.status}
                        </Badge>
                        {agent.is_paper_trading && (
                          <Badge variant="outline" className="text-xs">Paper</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {agent.description || 'No description'}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/agent-builder/${agent.id}`)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={agent.status === 'active' ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => toggleAgentStatus(agent)}
                        disabled={isActivating === agent.id || agent.status === 'draft'}
                      >
                        {agent.status === 'active' ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteAgent(agent)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No agents yet. Create your first agent to get started.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Help Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Free AI Nodes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Use AI Connector, Risk Assessment, and Sentiment Analysis nodes without any API keys.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">External APIs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Connect Aladdin, OpenAI, or Anthropic by entering your API key directly in the Investment AI node.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Exchange Connection</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Connect your exchange accounts in the Agent Builder to enable live trading.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AgentStudio;
