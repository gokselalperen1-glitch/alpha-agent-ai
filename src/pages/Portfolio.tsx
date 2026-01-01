import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Wallet, RefreshCw, Link2, Clock } from "lucide-react";
import { usePortfolioSync } from "@/hooks/usePortfolioSync";
import { LivePriceTicker } from "@/components/exchange/LivePriceTicker";
import { RealtimePortfolioTracker } from "@/components/exchange/RealtimePortfolioTracker";
import { QuickConnect } from "@/components/exchange/QuickConnect";

interface Transaction {
  id: string;
  asset_symbol: string;
  transaction_type: string;
  quantity: number;
  price: number;
  total_value: number;
  is_paper_trade: boolean;
  executed_at: string;
}

const Portfolio = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const { 
    connections, 
    isSyncing, 
    lastSyncTime, 
    syncPortfolio 
  } = usePortfolioSync(user?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadTransactions(session.user.id);
      }
      setLoading(false);
    });
  }, [navigate]);

  const loadTransactions = async (userId: string) => {
    const { data: transactionData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('executed_at', { ascending: false })
      .limit(20);

    if (transactionData) {
      setTransactions(transactionData);
    }
  };

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
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Portfolio</h1>
            <p className="text-muted-foreground mt-2">Track your assets and trading performance in real-time</p>
          </div>
          <div className="flex items-center gap-4">
            {lastSyncTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Last synced: {lastSyncTime.toLocaleTimeString()}
              </div>
            )}
            <Button
              onClick={() => syncPortfolio()}
              disabled={isSyncing || connections.length === 0}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Portfolio'}
            </Button>
          </div>
        </div>

        {/* Live Price Ticker */}
        <div className="mb-8">
          <LivePriceTicker />
        </div>

        {/* Connected Exchanges */}
        {connections.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Connected Exchanges
              </CardTitle>
              <CardDescription>Real-time data from your exchange accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {connections.map((conn) => (
                  <div 
                    key={conn.id} 
                    className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      conn.health_status === 'healthy' ? 'bg-green-500' : 
                      conn.health_status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <span className="font-medium">{conn.exchange_name}</span>
                    {conn.is_testnet && (
                      <Badge variant="outline" className="text-xs">Testnet</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {connections.length === 0 && (
          <div className="mb-8 grid md:grid-cols-2 gap-6">
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Exchanges Connected</h3>
                <p className="text-muted-foreground mb-4">Connect your exchange accounts to sync your portfolio in real-time</p>
              </CardContent>
            </Card>
            <QuickConnect 
              onSuccess={() => syncPortfolio()}
            />
          </div>
        )}

        {/* Real-time Portfolio Tracker */}
        {user && (
          <div className="mb-8">
            <RealtimePortfolioTracker userId={user.id} />
          </div>
        )}

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>Recent trading activity</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No transactions yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Mode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {new Date(tx.executed_at).toLocaleDateString()}{' '}
                        {new Date(tx.executed_at).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="font-medium">{tx.asset_symbol}</TableCell>
                      <TableCell>
                        <Badge variant={tx.transaction_type === 'buy' ? 'default' : 'destructive'}>
                          {tx.transaction_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{tx.quantity.toFixed(8)}</TableCell>
                      <TableCell className="text-right">${tx.price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${tx.total_value.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.is_paper_trade ? 'outline' : 'secondary'}>
                          {tx.is_paper_trade ? 'Paper' : 'Live'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Portfolio;
