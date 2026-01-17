-- Create positions table for margin/futures trading
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exchange_connection_id UUID REFERENCES public.exchange_connections(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  entry_price NUMERIC NOT NULL,
  current_price NUMERIC,
  quantity NUMERIC NOT NULL,
  leverage INTEGER NOT NULL DEFAULT 1,
  margin_type TEXT NOT NULL DEFAULT 'isolated' CHECK (margin_type IN ('isolated', 'cross')),
  position_type TEXT NOT NULL DEFAULT 'spot' CHECK (position_type IN ('spot', 'margin', 'perpetual', 'futures')),
  liquidation_price NUMERIC,
  margin_ratio NUMERIC,
  unrealized_pnl NUMERIC DEFAULT 0,
  realized_pnl NUMERIC DEFAULT 0,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  trailing_stop_percent NUMERIC,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'liquidated')),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table for advanced order management
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exchange_connection_id UUID REFERENCES public.exchange_connections(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  exchange_order_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  order_type TEXT NOT NULL CHECK (order_type IN ('market', 'limit', 'stop_limit', 'stop_market', 'trailing_stop', 'take_profit', 'take_profit_limit')),
  quantity NUMERIC NOT NULL,
  price NUMERIC,
  stop_price NUMERIC,
  trailing_delta NUMERIC,
  time_in_force TEXT DEFAULT 'GTC' CHECK (time_in_force IN ('GTC', 'IOC', 'FOK', 'GTD')),
  reduce_only BOOLEAN DEFAULT false,
  post_only BOOLEAN DEFAULT false,
  oco_group_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'partially_filled', 'filled', 'cancelled', 'rejected', 'expired')),
  filled_quantity NUMERIC DEFAULT 0,
  average_fill_price NUMERIC,
  fees NUMERIC DEFAULT 0,
  fee_currency TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Create leverage settings table per exchange/symbol
CREATE TABLE public.leverage_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exchange_connection_id UUID REFERENCES public.exchange_connections(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  leverage INTEGER NOT NULL DEFAULT 1 CHECK (leverage >= 1 AND leverage <= 125),
  margin_type TEXT NOT NULL DEFAULT 'isolated' CHECK (margin_type IN ('isolated', 'cross')),
  max_position_size NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, exchange_connection_id, symbol)
);

-- Create arbitrage opportunities table
CREATE TABLE public.arbitrage_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  buy_exchange TEXT NOT NULL,
  sell_exchange TEXT NOT NULL,
  buy_price NUMERIC NOT NULL,
  sell_price NUMERIC NOT NULL,
  spread_percent NUMERIC NOT NULL,
  estimated_profit NUMERIC,
  volume_available NUMERIC,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'executed', 'expired', 'missed'))
);

-- Enable RLS on all new tables
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leverage_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arbitrage_opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for positions
CREATE POLICY "Users can view their own positions" ON public.positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own positions" ON public.positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own positions" ON public.positions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own positions" ON public.positions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own orders" ON public.orders FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for leverage_settings
CREATE POLICY "Users can manage their leverage settings" ON public.leverage_settings FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for arbitrage (read only for users, system creates)
CREATE POLICY "Anyone can view arbitrage opportunities" ON public.arbitrage_opportunities FOR SELECT USING (true);
CREATE POLICY "System can manage arbitrage opportunities" ON public.arbitrage_opportunities FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_positions_user_id ON public.positions(user_id);
CREATE INDEX idx_positions_status ON public.positions(status);
CREATE INDEX idx_positions_symbol ON public.positions(symbol);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_exchange_order_id ON public.orders(exchange_order_id);
CREATE INDEX idx_arbitrage_symbol ON public.arbitrage_opportunities(symbol);
CREATE INDEX idx_arbitrage_status ON public.arbitrage_opportunities(status);

-- Add trigger for updated_at on positions
CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on leverage_settings
CREATE TRIGGER update_leverage_settings_updated_at
  BEFORE UPDATE ON public.leverage_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for positions and orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;