import { handleSignup } from './handler.mjs';
Deno.serve((request: Request) => handleSignup(request, {
  url: Deno.env.get('SUPABASE_URL'),
  serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
}));
