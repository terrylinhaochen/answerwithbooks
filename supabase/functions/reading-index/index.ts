import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
import {embedTexts} from '../_shared/guide-retrieval.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const checked=(r:any)=>{if(r.error)throw Error('Index persistence failed.');return r.data;};
Deno.serve(async req=>{
 const runner=Deno.env.get('BOOK_QUEUE_RUNNER_SECRET');
 if(req.method!=='POST'||!runner||req.headers.get('authorization')!=='Bearer '+runner)return new Response('Not authorized',{status:403});
 try{
  const rows=checked(await db.rpc('claim_guide_index'));if(!rows.length)return Response.json({idle:true});
  const receipt=crypto.randomUUID();checked(await db.from('guide_index_usage').insert({id:receipt,model:'text-embedding-3-small',state:'started'}));
  try{
   const result=await embedTexts(rows.map((r:any)=>r.body),(n:string)=>Deno.env.get(n));
   checked(await db.from('guide_index_usage').update({tokens:result.tokens,cost_usd:result.tokens===null?null:result.tokens*.02/1e6,state:result.tokens===null?'unknown':'settled'}).eq('id',receipt));
   for(let i=0;i<rows.length;i++)checked(await db.from('guide_retrieval_entries').update({embedding:JSON.stringify(result.vectors[i]),lease_token:null,lease_until:null}).eq('id',rows[i].id).eq('lease_token',rows[i].lease_token));
   await db.rpc('wake_guide_index');return Response.json({indexed:rows.length});
  }catch(e){
   for(const row of rows)await db.from('guide_retrieval_entries').update({lease_token:null,lease_until:null,next_attempt_at:new Date(Date.now()+60000).toISOString()}).eq('id',row.id).eq('lease_token',row.lease_token);
   throw e;
  }
 }catch{return Response.json({error:'Indexing will retry; existing readings remain available.'},{status:503});}
});
