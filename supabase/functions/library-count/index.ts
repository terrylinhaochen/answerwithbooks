import {createClient} from 'npm:@supabase/supabase-js@2.49.8';

const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const origins=new Set(['https://answerwithbooks.com','https://www.answerwithbooks.com','http://localhost:4321','http://127.0.0.1:4321']);

// The homepage needs a total, not every book's summary and signed cover URL.
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://answerwithbooks.com','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{headers,status});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(origin&&!origins.has(origin))return reply({error:'Origin not allowed'},403);
 try{
  // Keep the eligibility filters identical to shared-library's public list.
  const {count,error}=await db.from('book_processing_jobs').select('id',{count:'exact',head:true}).eq('visibility','public').eq('status','ready').is('duplicate_of',null);
  if(error||count===null)throw Error('Count unavailable');
  return reply({count});
 }catch{return reply({error:'Could not count the shared library.'},503);}
});
