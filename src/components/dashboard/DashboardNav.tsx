import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Bot, LayoutDashboard, Wallet, Settings, Brain, Target, ArrowRightLeft, TrendingUp, Landmark } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DashboardNavProps {
  user: User | null;
}

export const DashboardNav = ({ user }: DashboardNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold">InvestAI</h1>
            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="sm" className={cn("gap-2", isActive('/dashboard') && "bg-secondary/20")} onClick={() => navigate('/dashboard')}>
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </Button>
              <Button variant="ghost" size="sm" className={cn("gap-2", isActive('/trading') && "bg-secondary/20")} onClick={() => navigate('/trading')}>
                <Brain className="h-4 w-4" />
                AI Trading
              </Button>
              <Button variant="ghost" size="sm" className={cn("gap-2", isActive('/my-agents') && "bg-secondary/20")} onClick={() => navigate('/my-agents')}>
                <Bot className="h-4 w-4" />
                Agents
              </Button>
              <Button variant="ghost" size="sm" className={cn("gap-2", isActive('/portfolio') && "bg-secondary/20")} onClick={() => navigate('/portfolio')}>
                <Wallet className="h-4 w-4" />
                Portfolio
              </Button>
              <Button variant="ghost" size="sm" className={cn("gap-2", isActive('/positions') && "bg-secondary/20")} onClick={() => navigate('/positions')}>
                <Target className="h-4 w-4" />
                Positions
              </Button>
              <Button variant="ghost" size="sm" className={cn("gap-2", isActive('/arbitrage') && "bg-secondary/20")} onClick={() => navigate('/arbitrage')}>
                <ArrowRightLeft className="h-4 w-4" />
                Arbitrage
              </Button>
              <Button variant="ghost" size="sm" className={cn("gap-2", isActive('/investment-brokers') && "bg-secondary/20")} onClick={() => navigate('/investment-brokers')}>
                <Landmark className="h-4 w-4" />
                Brokers
              </Button>
              <Button variant="ghost" size="sm" className={cn("gap-2", isActive('/investment-portfolio') && "bg-secondary/20")} onClick={() => navigate('/investment-portfolio')}>
                <TrendingUp className="h-4 w-4" />
                Holdings
              </Button>
              <Button variant="ghost" size="sm" className={cn("gap-2", isActive('/investment-transactions') && "bg-secondary/20")} onClick={() => navigate('/investment-transactions')}>
                <ArrowRightLeft className="h-4 w-4" />
                Transactions
              </Button>
              <Button variant="ghost" size="sm" className={cn("gap-2", isActive('/exchange-connections') && "bg-secondary/20")} onClick={() => navigate('/exchange-connections')}>
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
