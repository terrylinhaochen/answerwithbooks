import {coverPalette} from '../_shared/book-cover-design.mjs';
import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
import {bookUser} from '../_shared/book-cli-auth.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const check=(r:any)=>{if(r.error)throw Error('Library unavailable');return r.data;};
const origins=new Set(['https://answerwithbooks.com','https://www.answerwithbooks.com','http://localhost:4321','http://127.0.0.1:4321']);
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
async function present(book:any){
 let coverUrl=null;if(book.cover_status==='ready'&&book.cover_path){coverUrl=check(await db.storage.from('private-books').createSignedUrl(book.cover_path,3600)).signedUrl;}
 let map:any={};try{map=JSON.parse(book.artifacts?.['reading/map.json']||'{}');}catch{}
 return {id:book.id,title:book.title,author:book.author,status:book.status,run_state:book.run_state,coverUrl,coverColor:coverPalette(book).bg,
 stage:book.status==='ready'?'ready':book.run_state==='failed'?'failed':book.source_import?.state!=='complete'?'extracting':'reading',
 orientation:map.orientation||'',summary:map.summary||'',questions:map.questions||[],
 chapters:(map.sections||[]).map((s:any)=>({title:s.title,sourceRefs:s.sourceRefs})),
 progress:{completed:book.cursor||0,total:book.total_sections||0}};
}
const fields='id,title,author,status,run_state,cover_status,cover_path,artifacts,source_import,cursor,total_sections,duplicate_of';
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://answerwithbooks.com','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{headers,status});
 if(req.method==='OPTIONS')return new Response(null,{headers});if(req.method!=='POST')return reply({error:'Method not allowed'},405);if(origin&&!origins.has(origin))return reply({error:'Origin not allowed'},403);
 try{
 const raw=await req.text();if(raw.length>6000)return reply({error:'Request too large'},413);const input=JSON.parse(raw);
 const bearer=req.headers.get('authorization')?.replace(/^Bearer /i,'')||'';
 if(input.action==='list'){
  const offset=Number.isSafeInteger(input.offset)&&input.offset>=0?input.offset:0;
  const rows=check(await db.from('book_processing_jobs').select(fields).eq('visibility','public').eq('status','ready').is('duplicate_of',null).order('created_at',{ascending:false}).range(offset,offset+49));
  return reply({books:await Promise.all(rows.map(present)),nextOffset:rows.length===50?offset+50:null});
 }
 const user=await bookUser(db,bearer);
 if(input.action==='mine'){
  if(!user)return reply({error:'Sign in to view your books.'},401);
  const ids=check(await db.from('reader_books').select('book_id').eq('user_id',user.id));
  if(!ids.length)return reply({books:[]});
  const rows=check(await db.from('book_processing_jobs').select(fields).eq('visibility','public').in('id',ids.map((r:any)=>r.book_id)).order('created_at',{ascending:false}));return reply({books:await Promise.all(rows.map(present))});
 }
 if(!uuid(input.id))return reply({error:'Invalid book'},400);
 let row=check(await db.from('book_processing_jobs').select(fields).eq('visibility','public').eq('id',input.id).maybeSingle());
 if(row?.duplicate_of)row=check(await db.from('book_processing_jobs').select(fields).eq('visibility','public').eq('id',row.duplicate_of).maybeSingle());
 if(!row)return reply({error:'Book not found'},404);
 if(input.action==='get')return reply({book:await present(row)});
 if(!user)return reply({error:'Sign in to continue.'},401);
 if(input.action==='save'){check(await db.from('reader_books').upsert({user_id:user.id,book_id:row.id},{onConflict:'user_id,book_id'}));return reply({saved:true});}
 if(input.action==='remove'){check(await db.from('reader_books').delete().eq('user_id',user.id).eq('book_id',row.id));return reply({removed:true});}
 if(input.action==='retry'){
  const owned=check(await db.from('book_processing_jobs').select('id,run_state,source_import').eq('id',row.id).eq('user_id',user.id).eq('visibility','public').maybeSingle());
  if(!owned)return reply({error:'Only the uploader can retry this book.'},403);
  if(owned.run_state!=='failed')return reply({saved:true});
  const extracting=owned.source_import?.state==='failed';
  check(await db.from('book_processing_jobs').update({run_state:extracting?'staging':'queued',...(extracting?{source_import:{...owned.source_import,state:'queued'}}:{}),attempts:0,error:null,next_attempt_at:new Date().toISOString()}).eq('id',row.id).eq('run_state','failed'));
  if(!extracting)check(await db.rpc('wake_book_processing',{p_count:1}));return reply({saved:true});
 }
 if(input.action==='source'){
  const plan=check(await db.rpc('reader_plan',{p_user:user.id}));if(!plan.active)return reply({error:'A subscription is required to read source text through the skill.',code:'SUBSCRIPTION_REQUIRED'},402);
  if(row.status!=='ready')return reply({error:'This book is still processing.'},409);
  const start=input.startLine??1,end=input.endLine??start+199;
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end-start>=500)return reply({error:'Request 1–500 source lines at a time.'},400);
  const source=check(await db.from('book_processing_jobs').select('source_text,source_text_sha').eq('id',row.id).eq('visibility','public').single());const lines=source.source_text.split('\n');
  if(start>lines.length)return reply({error:'Source line is out of range'},400);
  return reply({id:row.id,title:row.title,startLine:start,endLine:Math.min(end,lines.length),totalLines:lines.length,textSha:source.source_text_sha,text:lines.slice(start-1,end).join('\n')});
 }
 return reply({error:'Unknown action'},400);
 }catch{return reply({error:'Could not load the shared library. Please try again.'},500);}
});
