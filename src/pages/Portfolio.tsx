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
    portfolios, 
    connections, 
    totalValue, 
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

  const calculatePnL = (portfolio: { average_buy_price: number | null; current_value: number | null; quantity: number }) => {
    if (!portfolio.average_buy_price || !portfolio.current_value) return null;
    const costBasis = portfolio.average_buy_price * portfolio.quantity;
    const pnl = portfolio.current_value - costBasis;
    const pnlPercent = (pnl / costBasis) * 100;
    return { pnl, pnlPercent };
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={user} />
      <main className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Portfolio</h1>
            <p className="text-muted-foreground mt-2">Track your assets and trading performance</p>
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
          <Card className="mb-8 border-dashed">
            <CardContent className="py-8 text-center">
              <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Exchanges Connected</h3>
              <p className="text-muted-foreground mb-4">Connect your exchange accounts to sync your portfolio in real-time</p>
              <Button variant="outline" onClick={() => navigate('/exchange-connections')}>
                Connect Exchange
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Total Value Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Total Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            {portfolios.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {portfolios.length} asset{portfolios.length !== 1 ? 's' : ''} across {connections.length} exchange{connections.length !== 1 ? 's' : ''}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Holdings Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>Your current asset positions</CardDescription>
          </CardHeader>
          <CardContent>
            {portfolios.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No holdings yet. Start trading to build your portfolio.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Avg Price</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolios.map((portfolio) => {
                    const pnl = calculatePnL(portfolio);
                    return (
                      <TableRow key={portfolio.id}>
                        <TableCell className="font-medium">{portfolio.asset_symbol}</TableCell>
                        <TableCell className="text-right">{portfolio.quantity.toFixed(8)}</TableCell>
                        <TableCell className="text-right">
                          ${portfolio.average_buy_price?.toFixed(2) || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          ${portfolio.current_value?.toFixed(2) || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {pnl ? (
                            <div className="flex items-center justify-end gap-1">
                              {pnl.pnl >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              )}
                              <span className={pnl.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                                {pnl.pnlPercent.toFixed(2)}%
                              </span>
                            </div>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
