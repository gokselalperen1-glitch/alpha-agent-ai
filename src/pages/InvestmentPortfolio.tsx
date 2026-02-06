import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, TrendingUp, TrendingDown, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Holding {
  id: string;
  connection_id: string;
  symbol: string;
  quantity: number;
  current_price: number;
  average_cost: number;
  market_value: number;
  gain_loss: number;
  gain_loss_percent: number;
  asset_type: string;
  currency: string;
  last_price_update: string;
  broker_type?: string;
  account_name?: string;
}

interface PortfolioSummary {
  total_value: number;
  total_gain_loss: number;
  total_gain_loss_percent: number;
  holding_count: number;
  broker_count: number;
}

const InvestmentPortfolio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBroker, setFilterBroker] = useState("all");
  const [filterAssetType, setFilterAssetType] = useState("all");
  const [uniqueBrokers, setUniqueBrokers] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadPortfolio();
      }
      setLoading(false);
    });
  }, [navigate]);

  const loadPortfolio = async () => {
    try {
      const { data, error } = await supabase
        .from('investment_holdings')
        .select(`
          *,
          connection:investment_broker_connections(broker_type, account_name)
        `)
        .order('market_value', { ascending: false });

      if (error) {
        console.error('Error loading holdings:', error);
        return;
      }

      const holdingsWithBroker = (data || []).map((h: any) => ({
        ...h,
        broker_type: h.connection?.broker_type,
        account_name: h.connection?.account_name,
      }));

      setHoldings(holdingsWithBroker);

      // Extract unique brokers
      const brokers = [...new Set(holdingsWithBroker.map(h => h.broker_type))];
      setUniqueBrokers(brokers);

      // Calculate summary
      const totalValue = holdingsWithBroker.reduce((sum, h) => sum + (h.market_value || 0), 0);
      const totalGainLoss = holdingsWithBroker.reduce((sum, h) => sum + (h.gain_loss || 0), 0);
      const totalGainLossPercent = totalValue > 0 ? (totalGainLoss / (totalValue - totalGainLoss)) * 100 : 0;

      setSummary({
        total_value: totalValue,
        total_gain_loss: totalGainLoss,
        total_gain_loss_percent: totalGainLossPercent,
        holding_count: holdingsWithBroker.length,
        broker_count: brokers.length,
      });
    } catch (error) {
      console.error('Error loading portfolio:', error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-all-brokers', {
        body: {},
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Sync Started',
        description: 'Syncing portfolio from all brokers...',
      });

      setTimeout(() => {
        loadPortfolio();
        setSyncing(false);
      }, 2000);
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message,
        variant: 'destructive',
      });
      setSyncing(false);
    }
  };

  const filteredHoldings = holdings.filter(holding => {
    const matchesSearch = holding.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      holding.account_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBroker = filterBroker === 'all' || holding.broker_type === filterBroker;
    const matchesAssetType = filterAssetType === 'all' || holding.asset_type === filterAssetType;
    return matchesSearch && matchesBroker && matchesAssetType;
  });

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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Investment Portfolio</h1>
            <p className="text-muted-foreground mt-2">View all your holdings across connected brokers</p>
          </div>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Portfolio'}
          </Button>
        </div>

        {summary && (
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${summary.total_value.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Gain/Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.total_gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${summary.total_gain_loss.toFixed(2)}
                </div>
                <p className={`text-xs ${summary.total_gain_loss_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.total_gain_loss_percent >= 0 ? '+' : ''}{summary.total_gain_loss_percent.toFixed(2)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.holding_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Connected Brokers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.broker_count}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>Your assets across all investment accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4">
              <Input
                placeholder="Search by symbol or account name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Broker</label>
                  <select
                    value={filterBroker}
                    onChange={(e) => setFilterBroker(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  >
                    <option value="all">All Brokers</option>
                    {uniqueBrokers.map(broker => (
                      <option key={broker} value={broker}>{broker}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Asset Type</label>
                  <select
                    value={filterAssetType}
                    onChange={(e) => setFilterAssetType(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="stock">Stock</option>
                    <option value="crypto">Cryptocurrency</option>
                    <option value="etf">ETF</option>
                    <option value="bond">Bond</option>
                    <option value="option">Option</option>
                    <option value="forex">Forex</option>
                    <option value="commodity">Commodity</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredHoldings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground">No holdings found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Avg Cost</TableHead>
                      <TableHead className="text-right">Current Price</TableHead>
                      <TableHead className="text-right">Market Value</TableHead>
                      <TableHead className="text-right">Gain/Loss</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHoldings.map((holding) => (
                      <TableRow key={holding.id}>
                        <TableCell className="font-semibold">{holding.symbol}</TableCell>
                        <TableCell className="text-right">{holding.quantity.toFixed(4)}</TableCell>
                        <TableCell className="text-right">${holding.average_cost?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="text-right">${holding.current_price?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="text-right font-semibold">${holding.market_value?.toFixed(2) || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={holding.gain_loss >= 0 ? 'default' : 'destructive'}>
                            {holding.gain_loss >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                            ${Math.abs(holding.gain_loss).toFixed(2)} ({holding.gain_loss_percent >= 0 ? '+' : ''}{holding.gain_loss_percent.toFixed(2)}%)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{holding.account_name}</TableCell>
                        <TableCell className="text-sm"><Badge variant="outline">{holding.asset_type}</Badge></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>View History</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
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

export default InvestmentPortfolio;
