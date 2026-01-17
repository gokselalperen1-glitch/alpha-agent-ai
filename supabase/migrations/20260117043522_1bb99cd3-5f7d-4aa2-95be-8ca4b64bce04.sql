-- Fix arbitrage_opportunities RLS - restrict write access to service role only
DROP POLICY IF EXISTS "System can manage arbitrage opportunities" ON public.arbitrage_opportunities;

-- Note: System/edge functions use service role which bypasses RLS, so no explicit write policy needed
-- The table is read-only for authenticated users via the SELECT policy