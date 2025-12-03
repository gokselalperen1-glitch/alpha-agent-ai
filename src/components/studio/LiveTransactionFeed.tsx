import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

interface Transaction {
  id: string;
  asset_symbol: string;
  transaction_type: 'buy' | 'sell';
  order_type: 'market' | 'limit';
  quantity: number;
  price: number;
  total_value: number;
  is_paper_trade: boolean;
  executed_at: string;
}

interface LiveTransactionFeedProps {
  agentId: string;
  userId: string;
}

export const LiveTransactionFeed = ({ agentId, userId }: LiveTransactionFeedProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTrades: 0,
    totalVolume: 0,
    buyCount: 0,
    sellCount: 0,
  });

  useEffect(() => {
    loadTransactions();

    // Real-time subscription
    const channel = supabase
      .channel(`transactions-${agentId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `agent_id=eq.${agentId}`,
      }, (payload) => {
        console.log('New transaction:', payload);
        setTransactions(prev => [payload.new as Transaction, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('agent_id', agentId)
      .order('executed_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setTransactions(data as Transaction[]);
      
      // Calculate stats
      setStats({
        totalTrades: data.length,
        totalVolume: data.reduce((sum, t) => sum + t.total_value, 0),
        buyCount: data.filter(t => t.transaction_type === 'buy').length,
        sellCount: data.filter(t => t.transaction_type === 'sell').length,
      });
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Total Trades</p>
          <p className="text-lg font-bold">{stats.totalTrades}</p>
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Volume</p>
          <p className="text-lg font-bold">${stats.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-3 bg-green-500/10 rounded-lg">
          <p className="text-xs text-green-400">Buys</p>
          <p className="text-lg font-bold text-green-400">{stats.buyCount}</p>
        </div>
        <div className="p-3 bg-red-500/10 rounded-lg">
          <p className="text-xs text-red-400">Sells</p>
          <p className="text-lg font-bold text-red-400">{stats.sellCount}</p>
        </div>
      </div>

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No transactions yet</p>
          <p className="text-sm text-muted-foreground mt-1">Transactions will appear here when the agent executes trades</p>
        </div>
      ) : (
        <ScrollArea className="h-[350px] border rounded-lg">
          <div className="p-2 space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3 bg-card border rounded-lg flex items-center gap-4 hover:bg-muted/50 transition-colors"
              >
                <div className={`p-2 rounded-full ${
                  tx.transaction_type === 'buy' 
                    ? 'bg-green-500/20 text-green-500' 
                    : 'bg-red-500/20 text-red-500'
                }`}>
                  {tx.transaction_type === 'buy' 
                    ? <TrendingUp className="h-4 w-4" />
                    : <TrendingDown className="h-4 w-4" />
                  }
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tx.asset_symbol}</span>
                    <Badge variant={tx.transaction_type === 'buy' ? 'default' : 'destructive'} className="text-xs">
                      {tx.transaction_type.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {tx.order_type}
                    </Badge>
                    {tx.is_paper_trade ? (
                      <Badge variant="secondary" className="text-xs">📝 Paper</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">💰 Live</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tx.quantity.toFixed(6)} @ ${tx.price.toFixed(2)}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-medium">${tx.total_value.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.executed_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
