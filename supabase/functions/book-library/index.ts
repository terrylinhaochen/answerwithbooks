import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
import {bookUser,tokenHash} from '../_shared/book-cli-auth.mjs';
import {searchLibrary,indexLibraryBatch,libraryQuery} from '../_shared/book-library.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const origins=new Set(['https://answerwithbooks.com','https://www.answerwithbooks.com','http://localhost:4321','http://127.0.0.1:4321']);
Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://answerwithbooks.com','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'Origin not allowed'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='POST')return reply({error:'Method not allowed'},405);
 const bearer=request.headers.get('authorization')?.replace(/^Bearer /i,'');if(!bearer)return reply({error:'Connect your account to search private books.'},401);
 try{
  if(Number(request.headers.get('content-length')||0)>12000)return reply({error:'Request too large'},413);
  const raw=await request.text();if(raw.length>12000)return reply({error:'Request too large'},413);
  let input;try{input=JSON.parse(raw);}catch{return reply({error:'Send a JSON object.'},400);}
  if(!input||typeof input!=='object'||Array.isArray(input))return reply({error:'Send a JSON object.'},400);
  const key=Deno.env.get('OPENAI_API_KEY');
  if(input.action==='drain'){
   const runner=Deno.env.get('BOOK_QUEUE_RUNNER_SECRET');
   if(!runner||await tokenHash(bearer)!==await tokenHash(runner))return reply({error:'Not authorized'},403);
   if(!key)return reply({error:'Semantic indexing is not configured.'},503);
   const result=await indexLibraryBatch({db,key});
   await db.rpc('wake_book_library');return reply(result);
  }
  if(input.action!=='search')return reply({error:'Use the search action.'},400);
  const user=await bookUser(db,bearer);if(!user)return reply({error:'Your account session expired. Sign in again.'},401);
  try{libraryQuery(input);}catch(error){return reply({error:(error as Error).message},400);}
  const result=await searchLibrary({db,user,input,key});
  return result.rateLimited?reply({error:'Search limit reached. Retry in one minute.'},429):reply(result);
 }catch{return reply({error:'Library retrieval is temporarily unavailable. Your books and processing jobs are unchanged.'},503);}
});
