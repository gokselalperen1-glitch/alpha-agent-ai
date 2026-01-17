import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Order {
  id: string;
  exchange_order_id: string | null;
  symbol: string;
  side: 'buy' | 'sell';
  order_type: string;
  quantity: number;
  price: number | null;
  stop_price: number | null;
  trailing_delta: number | null;
  time_in_force: string;
  reduce_only: boolean;
  post_only: boolean;
  oco_group_id: string | null;
  status: string;
  filled_quantity: number;
  average_fill_price: number | null;
  fees: number;
  fee_currency: string | null;
  created_at: string;
  executed_at: string | null;
  agent_id: string | null;
  position_id: string | null;
  exchange_connection_id: string | null;
}

interface UseOrdersOptions {
  status?: 'pending' | 'open' | 'filled' | 'cancelled' | 'all';
  limit?: number;
}

export const useOrders = (options: UseOrdersOptions = {}) => {
  const { status = 'all', limit = 50 } = options;
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      let query = supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      setOrders((data || []) as Order[]);
      setError(null);
    } catch (e) {
      console.error('Error loading orders:', e);
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }, [status, limit]);

  // Subscribe to realtime changes
  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order change:', payload);
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  // Cancel an order
  const cancelOrder = useCallback(async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error('Order not found');

    // If order has exchange_order_id, need to cancel on exchange too
    if (order.exchange_order_id && order.exchange_connection_id) {
      // TODO: Call exchange API to cancel
      console.log('Would cancel order on exchange:', order.exchange_order_id);
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId);

    if (error) throw error;
    loadOrders();
  }, [orders, loadOrders]);

  // Modify an order (for limit orders)
  const modifyOrder = useCallback(async (
    orderId: string, 
    updates: { price?: number; quantity?: number; stop_price?: number }
  ) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) throw new Error('Order not found');

    if (order.status !== 'open' && order.status !== 'pending') {
      throw new Error('Can only modify open or pending orders');
    }

    // TODO: For live orders, need to cancel and recreate on exchange
    
    const { error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId);

    if (error) throw error;
    loadOrders();
  }, [orders, loadOrders]);

  // Get open orders
  const openOrders = orders.filter(o => o.status === 'open' || o.status === 'pending');
  
  // Get filled orders
  const filledOrders = orders.filter(o => o.status === 'filled');

  // Calculate total fees
  const totalFees = orders.reduce((sum, o) => sum + (o.fees || 0), 0);

  return {
    orders,
    openOrders,
    filledOrders,
    isLoading,
    error,
    totalFees,
    loadOrders,
    cancelOrder,
    modifyOrder
  };
};
