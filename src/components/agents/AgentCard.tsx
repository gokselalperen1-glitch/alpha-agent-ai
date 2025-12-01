import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MoreVertical, Play, Pause, Edit, Trash2, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { format } from "date-fns";

interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    is_paper_trading: boolean;
    created_at: string;
    updated_at: string;
  };
  stats: {
    successRate: number;
    totalExecutions: number;
    profitLoss: number;
  };
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

export const AgentCard = ({ agent, stats, onEdit, onDelete, onToggleStatus }: AgentCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-secondary/10 text-secondary border-secondary/20";
      case "paused":
        return "bg-muted text-muted-foreground border-border";
      case "draft":
        return "bg-accent/10 text-accent-foreground border-accent/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const isProfitable = stats.profitLoss > 0;

  return (
    <Card className="hover:shadow-medium transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              {agent.is_paper_trading && (
                <Badge variant="outline" className="text-xs">
                  Paper
                </Badge>
              )}
            </div>
            <CardDescription className="line-clamp-2">
              {agent.description || "No description"}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleStatus} className="gap-2">
                {agent.status === "active" ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Agent</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{agent.name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge className={getStatusColor(agent.status)}>
            {agent.status}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="text-lg font-semibold">{stats.successRate}%</div>
            <div className="text-xs text-muted-foreground">Success</div>
          </div>
          <div className="text-center border-l border-r">
            <div className="text-xs text-muted-foreground mb-1">Executions</div>
            <div className="text-lg font-semibold">{stats.totalExecutions}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {isProfitable ? (
                <TrendingUp className="h-3 w-3 text-secondary" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
            </div>
            <div className={`text-lg font-semibold ${isProfitable ? "text-secondary" : "text-destructive"}`}>
              ${Math.abs(stats.profitLoss)}
            </div>
            <div className="text-xs text-muted-foreground">P&L</div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Updated {format(new Date(agent.updated_at), "MMM d, yyyy")}
      </CardFooter>
    </Card>
  );
};
