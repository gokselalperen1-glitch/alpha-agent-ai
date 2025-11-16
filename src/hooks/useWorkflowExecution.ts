import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExecutionResult {
  success: boolean;
  executionId?: string;
  outputs?: any;
  error?: string;
}

export const useWorkflowExecution = () => {
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  const executeWorkflow = async (agentId: string, workflowData: any): Promise<ExecutionResult> => {
    setIsExecuting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('workflow-executor', {
        body: {
          agentId,
          workflowData,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Execution failed');
      }

      toast({
        title: 'Execution Complete',
        description: `Workflow executed successfully`,
      });

      return {
        success: true,
        executionId: data.executionId,
        outputs: data.outputs,
      };
    } catch (error: any) {
      console.error('Workflow execution error:', error);
      
      toast({
        title: 'Execution Failed',
        description: error.message || 'Failed to execute workflow',
        variant: 'destructive',
      });

      return {
        success: false,
        error: error.message,
      };
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    executeWorkflow,
    isExecuting,
  };
};
