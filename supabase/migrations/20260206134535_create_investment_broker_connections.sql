/*
  # Create Investment Broker Connections and Portfolio Management

  1. New Tables
    - `investment_broker_connections` - Stores user connections to investment brokers
    - `investment_holdings` - Stores user holdings/positions from each broker
    - `investment_transactions` - Stores transaction history from brokers
    - `portfolio_sync_history` - Tracks when portfolios were last synced
    
  2. Security
    - Enable RLS on all tables
    - Users can only view their own data
    - Encrypted storage of credentials

  3. Broker Support
    - Alpaca
    - Interactive Brokers
    - TD Ameritrade
    - Aladdin
*/

CREATE TABLE IF NOT EXISTS investment_broker_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  broker_type text NOT NULL CHECK (broker_type IN ('alpaca', 'interactive_brokers', 'td_ameritrade', 'aladdin')),
  account_name text,
  account_number text,
  api_key_encrypted text,
  api_secret_encrypted text,
  auth_token_encrypted text,
  oauth_token_encrypted text,
  oauth_refresh_token_encrypted text,
  oauth_expiry_at timestamptz,
  is_active boolean DEFAULT true,
  is_testnet boolean DEFAULT false,
  health_status text DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'auth_failed', 'rate_limited', 'network_error', 'error', 'unknown')),
  last_health_check timestamptz,
  last_sync_at timestamptz,
  permissions jsonb DEFAULT '{"read": true, "trade": false, "withdraw": false}',
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, broker_type, account_number)
);

CREATE TABLE IF NOT EXISTS investment_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES investment_broker_connections(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  quantity numeric NOT NULL,
  average_cost numeric,
  current_price numeric,
  market_value numeric,
  currency text DEFAULT 'USD',
  asset_type text DEFAULT 'stock' CHECK (asset_type IN ('stock', 'crypto', 'etf', 'bond', 'option', 'forex', 'commodity')),
  gain_loss numeric,
  gain_loss_percent numeric,
  last_price_update timestamptz,
  metadata jsonb,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, connection_id, symbol)
);

CREATE TABLE IF NOT EXISTS investment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES investment_broker_connections(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'dividend', 'interest', 'fee', 'deposit', 'withdrawal', 'split', 'spin_off')),
  quantity numeric,
  price numeric,
  amount numeric,
  fees numeric DEFAULT 0,
  net_amount numeric,
  transaction_date date NOT NULL,
  settlement_date date,
  broker_transaction_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio_sync_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES investment_broker_connections(id) ON DELETE CASCADE,
  sync_type text NOT NULL CHECK (sync_type IN ('holdings', 'transactions', 'full')),
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  error_message text,
  holdings_count integer,
  transactions_count integer,
  duration_ms integer,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE investment_broker_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own broker connections"
  ON investment_broker_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own broker connections"
  ON investment_broker_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own broker connections"
  ON investment_broker_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own broker connections"
  ON investment_broker_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own holdings"
  ON investment_holdings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own holdings"
  ON investment_holdings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own holdings"
  ON investment_holdings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions"
  ON investment_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own sync history"
  ON portfolio_sync_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_investment_broker_connections_user_id ON investment_broker_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_broker_connections_active ON investment_broker_connections(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_user_id ON investment_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_connection_id ON investment_holdings(connection_id);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_symbol ON investment_holdings(user_id, symbol);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_user_id ON investment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_connection_id ON investment_transactions(connection_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_date ON investment_transactions(user_id, transaction_date);
