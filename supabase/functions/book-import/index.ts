import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
import {bookUser} from '../_shared/book-cli-auth.mjs';
import {agentImportHandler} from '../_shared/book-agent-import-http.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(agentImportHandler(db,bookUser));
