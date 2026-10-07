import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
import {cliAuthHandler} from './handler.mjs';
Deno.serve(cliAuthHandler(createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})));
