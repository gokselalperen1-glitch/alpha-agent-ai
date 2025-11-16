import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Execution {
  id: string;
  agent_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  logs: any;
  agents: {
    name: string;
  };
}

export const ExecutionHistory = () => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExecutions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('execution-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'executions',
        },
        (payload) => {
          console.log('Execution update:', payload);
          fetchExecutions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchExecutions = async () => {
    try {
      const { data, error } = await supabase
        .from('executions')
        .select('*, agents(name)')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      console.error('Error fetching executions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      running: "secondary",
      pending: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Executions</CardTitle>
      </CardHeader>
      <CardContent>
        {executions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No executions yet
          </p>
        ) : (
          <div className="space-y-4">
            {executions.map((execution) => (
              <div
                key={execution.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(execution.status)}
                  <div>
                    <p className="font-medium text-foreground">
                      {execution.agents?.name || 'Unknown Agent'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(execution.started_at), {
                        addSuffix: true,
                      })}
                    </p>
                    {execution.error_message && (
                      <p className="text-sm text-destructive mt-1">
                        {execution.error_message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(execution.status)}
                  {execution.logs && Array.isArray(execution.logs) && execution.logs.length > 0 && (
                    <Badge variant="outline">
                      {execution.logs.length} steps
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
