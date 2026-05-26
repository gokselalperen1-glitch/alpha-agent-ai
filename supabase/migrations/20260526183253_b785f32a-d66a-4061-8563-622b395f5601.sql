
-- 1. Fix arbitrage_opportunities overly permissive policy
DROP POLICY IF EXISTS "System can manage arbitrage opportunities" ON public.arbitrage_opportunities;
-- No replacement user-facing write policy; edge functions use service_role which bypasses RLS.

-- 2. Add INSERT policy for profiles (self-recovery)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3. Restrict client read access to encrypted credential columns.
-- Revoke column-level SELECT for anon/authenticated; service_role keeps full access.
REVOKE SELECT (api_key_encrypted, api_secret_encrypted, passphrase_encrypted)
  ON public.exchange_connections FROM anon, authenticated;

REVOKE SELECT (api_key_encrypted, api_secret_encrypted, auth_token_encrypted)
  ON public.investment_broker_connections FROM anon, authenticated;

REVOKE SELECT (api_key_encrypted)
  ON public.api_provider_keys FROM anon, authenticated;
