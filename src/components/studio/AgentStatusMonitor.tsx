import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, XCircle, Clock, Activity, 
  ChevronRight, AlertCircle 
} from 'lucide-react';

interface Execution {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  logs: any[];
}

interface AgentStatusMonitorProps {
  agentId: string;
  userId: string;
}

export const AgentStatusMonitor = ({ agentId, userId }: AgentStatusMonitorProps) => {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExecutions();

    // Real-time subscription for execution updates
    const channel = supabase
      .channel(`executions-${agentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'executions',
        filter: `agent_id=eq.${agentId}`,
      }, (payload) => {
        console.log('Execution update:', payload);
        loadExecutions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const loadExecutions = async () => {
    const { data, error } = await supabase
      .from('executions')
      .select('*')
      .eq('agent_id', agentId)
      .order('started_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      const typedData = data.map(exec => ({
        ...exec,
        logs: Array.isArray(exec.logs) ? exec.logs : []
      })) as Execution[];
      setExecutions(typedData);
      if (!selectedExecution && typedData.length > 0) {
        setSelectedExecution(typedData[0]);
      }
    }
    setLoading(false);
  };

  const statusIcons = {
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
    running: <Activity className="h-4 w-4 text-blue-500 animate-pulse" />,
    completed: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-red-500" />,
    cancelled: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  };

  const statusColors = {
    pending: 'bg-muted text-muted-foreground',
    running: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    cancelled: 'bg-yellow-500/20 text-yellow-400',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No executions yet</p>
        <p className="text-sm text-muted-foreground mt-1">Click "Execute Now" to run this agent</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Execution List */}
      <div className="border rounded-lg">
        <div className="p-3 border-b bg-muted/50">
          <h4 className="font-medium text-sm">Recent Executions</h4>
        </div>
        <ScrollArea className="h-[300px]">
          <div className="p-2 space-y-1">
            {executions.map((exec) => (
              <div
                key={exec.id}
                className={`p-3 rounded-lg cursor-pointer transition-all flex items-center gap-3 ${
                  selectedExecution?.id === exec.id 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedExecution(exec)}
              >
                {statusIcons[exec.status]}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {new Date(exec.started_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {exec.completed_at 
                      ? `Duration: ${Math.round((new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime()) / 1000)}s`
                      : 'In progress...'}
                  </p>
                </div>
                <Badge className={statusColors[exec.status]}>
                  {exec.status}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Execution Details */}
      <div className="border rounded-lg">
        <div className="p-3 border-b bg-muted/50">
          <h4 className="font-medium text-sm">Execution Details</h4>
        </div>
        {selectedExecution ? (
          <ScrollArea className="h-[300px]">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={statusColors[selectedExecution.status]}>
                  {selectedExecution.status}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Started</span>
                <span className="text-sm">{new Date(selectedExecution.started_at).toLocaleString()}</span>
              </div>

              {selectedExecution.completed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="text-sm">{new Date(selectedExecution.completed_at).toLocaleString()}</span>
                </div>
              )}

              {selectedExecution.error_message && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{selectedExecution.error_message}</p>
                </div>
              )}

              {selectedExecution.logs && selectedExecution.logs.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-2">Execution Log</h5>
                  <div className="space-y-2">
                    {selectedExecution.logs.map((log: any, index: number) => (
                      <div key={index} className="p-2 bg-muted rounded text-xs font-mono">
                        <div className="flex items-center gap-2">
                          {log.status === 'success' || log.status === 'completed' ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : log.status === 'error' || log.status === 'failed' ? (
                            <XCircle className="h-3 w-3 text-red-500" />
                          ) : (
                            <Activity className="h-3 w-3 text-blue-500" />
                          )}
                          <span className="text-muted-foreground">
                            {log.nodeType || log.nodeId}
                          </span>
                        </div>
                        {log.result && (
                          <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                            {typeof log.result === 'string' 
                              ? log.result.slice(0, 200) 
                              : JSON.stringify(log.result, null, 2).slice(0, 200)}
                            {(typeof log.result === 'string' ? log.result.length : JSON.stringify(log.result).length) > 200 && '...'}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            Select an execution to view details
          </div>
        )}
      </div>
    </div>
  );
};
