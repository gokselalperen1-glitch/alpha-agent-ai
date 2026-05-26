import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface AuthResult {
  userId: string;
  token: string;
}

/**
 * Validates the JWT in the Authorization header.
 * Returns { userId, token } on success, or a Response (401) to return directly.
 */
export async function requireAuth(req: Request): Promise<AuthResult | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  return { userId: data.user.id, token };
}

/**
 * Returns a generic error response while logging full details server-side.
 */
export function safeError(error: unknown, status = 500): Response {
  console.error('Edge function error:', error);
  return new Response(
    JSON.stringify({ success: false, error: 'An error occurred processing your request' }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
