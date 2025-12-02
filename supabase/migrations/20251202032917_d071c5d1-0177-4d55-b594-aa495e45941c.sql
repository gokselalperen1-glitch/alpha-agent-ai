-- Add new columns to exchange_connections table for enhanced features
ALTER TABLE exchange_connections 
  ADD COLUMN IF NOT EXISTS passphrase_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS is_testnet BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"read": true, "trade": false, "withdraw": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS supported_pairs TEXT[],
  ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS rate_limit_config JSONB DEFAULT '{}'::jsonb;

-- Create api_provider_keys table for data provider API keys
CREATE TABLE IF NOT EXISTS api_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS on api_provider_keys
ALTER TABLE api_provider_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for api_provider_keys
CREATE POLICY "Users can manage their own API provider keys"
ON api_provider_keys
FOR ALL
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_api_provider_keys_updated_at
BEFORE UPDATE ON api_provider_keys
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();