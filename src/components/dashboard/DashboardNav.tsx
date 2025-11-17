import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, Bot, LayoutDashboard, Wallet, Settings } from "lucide-react";
import { toast } from "sonner";

interface DashboardNavProps {
  user: User | null;
}

export const DashboardNav = ({ user }: DashboardNavProps) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold">InvestAI</h1>
            <div className="hidden md:flex items-center gap-6">
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/dashboard')}>
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </Button>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/agent-builder')}>
                <Bot className="h-4 w-4" />
                My Agents
              </Button>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/portfolio')}>
                <Wallet className="h-4 w-4" />
                Portfolio
              </Button>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/exchange-connections')}>
                <Settings className="h-4 w-4" />
                Connections
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
