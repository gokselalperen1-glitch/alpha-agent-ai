import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { PositionManager } from "@/components/positions/PositionManager";
import { OrderManager } from "@/components/orders/OrderManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, ListOrdered } from "lucide-react";

const Positions = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={user} />
      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Trading Management</h1>
          <p className="text-muted-foreground mt-2">
            Monitor positions, manage orders, and track your trading performance
          </p>
        </div>

        <Tabs defaultValue="positions" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="positions" className="gap-2">
              <Target className="h-4 w-4" />
              Positions
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ListOrdered className="h-4 w-4" />
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="positions">
            {user && <PositionManager userId={user.id} />}
          </TabsContent>

          <TabsContent value="orders">
            <OrderManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Positions;
