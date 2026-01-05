import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DecisionStep {
  id: string;
  name: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  value?: string;
  duration?: number;
}

interface AgentDecisionFlowProps {
  steps: DecisionStep[];
  className?: string;
}

export const AgentDecisionFlow = ({ steps, className }: AgentDecisionFlowProps) => {
  return (
    <div className={cn("space-y-2", className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-3">
          {/* Status icon */}
          <div className="flex-shrink-0">
            {step.status === 'pending' && (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            {step.status === 'loading' && (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            )}
            {step.status === 'success' && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {step.status === 'error' && (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
          </div>
          
          {/* Step content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-sm font-medium",
                step.status === 'pending' && "text-muted-foreground",
                step.status === 'loading' && "text-primary",
                step.status === 'success' && "text-foreground",
                step.status === 'error' && "text-destructive"
              )}>
                {step.name}
              </span>
              {step.duration !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {step.duration}ms
                </span>
              )}
            </div>
            {step.value && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {step.value}
              </p>
            )}
          </div>
          
          {/* Connector line */}
          {index < steps.length - 1 && (
            <div className="absolute left-[9px] mt-7 w-0.5 h-4 bg-border" />
          )}
        </div>
      ))}
    </div>
  );
};
