import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownLeft, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Transaction {
  id: string;
  symbol: string;
  transaction_type: string;
  quantity: number;
  price: number;
  amount: number;
  fees: number;
  net_amount: number;
  transaction_date: string;
  broker_type?: string;
  account_name?: string;
}

interface TransactionSummary {
  total_buys: number;
  total_sells: number;
  total_fees: number;
  total_dividends: number;
  transaction_count: number;
}

const InvestmentTransactions = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadTransactions();
      }
      setLoading(false);
    });
  }, [navigate]);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('investment_transactions')
        .select(`
          *,
          connection:investment_broker_connections(broker_type, account_name)
        `)
        .order('transaction_date', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error loading transactions:', error);
        return;
      }

      const txWithBroker = (data || []).map((t: any) => ({
        ...t,
        broker_type: t.connection?.broker_type,
        account_name: t.connection?.account_name,
      }));

      setTransactions(txWithBroker);

      // Calculate summary
      const buys = txWithBroker.filter(t => t.transaction_type === 'buy').length;
      const sells = txWithBroker.filter(t => t.transaction_type === 'sell').length;
      const totalFees = txWithBroker.reduce((sum, t) => sum + (t.fees || 0), 0);
      const totalDividends = txWithBroker.filter(t => t.transaction_type === 'dividend')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      setSummary({
        total_buys: buys,
        total_sells: sells,
        total_fees: totalFees,
        total_dividends: totalDividends,
        transaction_count: txWithBroker.length,
      });
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <ArrowDownLeft className="h-4 w-4 text-red-600" />;
      case 'sell':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'dividend':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'interest':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case 'fee':
        return <TrendingDown className="h-4 w-4 text-gray-600" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'buy':
        return 'variant="outline"';
      case 'sell':
        return 'variant="default"';
      case 'dividend':
      case 'interest':
        return 'variant="secondary"';
      case 'fee':
        return 'variant="destructive"';
      default:
        return 'variant="outline"';
    }
  };

  const getTransactionDisplay = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const filterTransactions = () => {
    return transactions.filter(tx => {
      const matchesSearch = tx.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || tx.transaction_type === filterType;
      const txDate = new Date(tx.transaction_date);
      const now = new Date();
      let matchesDate = true;

      if (dateRange === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = txDate >= weekAgo;
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = txDate >= monthAgo;
      } else if (dateRange === 'year') {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        matchesDate = txDate >= yearAgo;
      }

      return matchesSearch && matchesType && matchesDate;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredTransactions = filterTransactions();

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={user} />
      <main className="container mx-auto py-8 px-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transaction History</h1>
          <p className="text-muted-foreground mt-2">View all your transactions across connected brokers</p>
        </div>

        {summary && (
          <div className="grid gap-4 md:grid-cols-5 my-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.transaction_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Buy Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{summary.total_buys}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sell Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary.total_sells}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${summary.total_fees.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dividends Received</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${summary.total_dividends.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>All trades and actions across your investment accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4">
              <Input
                placeholder="Search by symbol..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Transaction Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                    <option value="dividend">Dividend</option>
                    <option value="interest">Interest</option>
                    <option value="fee">Fee</option>
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Time Period</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  >
                    <option value="all">All Time</option>
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="year">Last Year</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Fees</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Account</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">
                          {new Date(tx.transaction_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-semibold">{tx.symbol}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            {getTransactionIcon(tx.transaction_type)}
                            {getTransactionDisplay(tx.transaction_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{tx.quantity?.toFixed(4) || '-'}</TableCell>
                        <TableCell className="text-right">${tx.price?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="text-right">${tx.amount?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="text-right text-red-600">${tx.fees?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell className="text-right font-semibold">${tx.net_amount?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{tx.account_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default InvestmentTransactions;
