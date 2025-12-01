import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { AgentCard } from "@/components/agents/AgentCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: string;
  is_paper_trading: boolean;
  created_at: string;
  updated_at: string;
}

interface AgentStats {
  successRate: number;
  totalExecutions: number;
  profitLoss: number;
}

const MyAgents = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentStats, setAgentStats] = useState<Record<string, AgentStats>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchAgents();
    }
  }, [user, statusFilter]);

  const fetchAgents = async () => {
    if (!user) return;

    let query = supabase
      .from("agents")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter as "active" | "draft" | "paused" | "error");
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching agents:", error);
      return;
    }

    setAgents(data || []);

    // Fetch stats for each agent
    if (data) {
      const statsPromises = data.map(agent => fetchAgentStats(agent.id));
      const stats = await Promise.all(statsPromises);
      const statsMap = data.reduce((acc, agent, index) => {
        acc[agent.id] = stats[index];
        return acc;
      }, {} as Record<string, AgentStats>);
      setAgentStats(statsMap);
    }
  };

  const fetchAgentStats = async (agentId: string): Promise<AgentStats> => {
    // Fetch executions
    const { data: executions } = await supabase
      .from("executions")
      .select("status")
      .eq("agent_id", agentId);

    const totalExecutions = executions?.length || 0;
    const successfulExecutions = executions?.filter(e => e.status === "completed").length || 0;
    const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    // Fetch transactions for P&L
    const { data: transactions } = await supabase
      .from("transactions")
      .select("transaction_type, total_value, fees")
      .eq("agent_id", agentId);

    let profitLoss = 0;
    if (transactions) {
      transactions.forEach(tx => {
        const value = Number(tx.total_value) || 0;
        const fees = Number(tx.fees) || 0;
        if (tx.transaction_type === "sell") {
          profitLoss += value - fees;
        } else if (tx.transaction_type === "buy") {
          profitLoss -= value + fees;
        }
      });
    }

    return {
      successRate: Math.round(successRate),
      totalExecutions,
      profitLoss: Math.round(profitLoss * 100) / 100
    };
  };

  const handleDeleteAgent = async (agentId: string) => {
    const { error } = await supabase
      .from("agents")
      .delete()
      .eq("id", agentId);

    if (!error) {
      fetchAgents();
    }
  };

  const handleToggleStatus = async (agentId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? ("paused" as const) : ("active" as const);
    const { error } = await supabase
      .from("agents")
      .update({ status: newStatus })
      .eq("id", agentId);

    if (!error) {
      fetchAgents();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredAgents = agents;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={user} />
      <main className="container mx-auto py-8 px-4">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Trading Agents</h1>
              <p className="text-muted-foreground mt-1">
                Manage and monitor your AI-powered trading strategies
              </p>
            </div>
            <Button onClick={() => navigate("/agent-builder")} className="gap-2">
              <Plus className="h-4 w-4" />
              New Agent
            </Button>
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="paused">Paused</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">No agents yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first AI trading agent to get started
                </p>
                <Button onClick={() => navigate("/agent-builder")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Agent
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  stats={agentStats[agent.id] || { successRate: 0, totalExecutions: 0, profitLoss: 0 }}
                  onEdit={() => navigate(`/agent-builder/${agent.id}`)}
                  onDelete={() => handleDeleteAgent(agent.id)}
                  onToggleStatus={() => handleToggleStatus(agent.id, agent.status)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyAgents;
