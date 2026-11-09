import {suggestGuideBooks} from '../_shared/guide-suggestions.mjs';
import {guideMarkdown} from '../_shared/guide-markdown.mjs';
import {generateGuideCover,validateGuideCoverDesign,decodeImportedGuideCover,guideCoverVersion} from '../_shared/guide-cover.mjs';
import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
import {bookUser} from '../_shared/book-cli-auth.mjs';
import {createBookModelClient} from '../_shared/book-model.mjs';
import {checked,sourceBooks,answerGuides,drainGuide} from '../_shared/guide-worker.mjs';
import {hydrateReading,sourceSpan} from '../_shared/reading-guides.mjs';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const allowed=new Set(['https://answerwithbooks.com','https://www.answerwithbooks.com','http://localhost:4321','http://127.0.0.1:4321']);
const hash=async(bytes:BufferSource)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v);
async function displayBooks(userId:string|null,ids:string[],savedReading=false){
 if(!ids.length)return [];
 let query=db.from('book_processing_jobs').select('id,title,author,cover_path,cover_status,visibility,archived_at').or(savedReading&&userId?`user_id.eq.${userId},and(visibility.eq.public,archived_at.is.null)`:userId?`visibility.eq.public,user_id.eq.${userId}`:'visibility.eq.public').eq('status','ready').eq('deletion_pending',false);
 if(!savedReading||!userId)query=query.is('archived_at',null);
 const rows=checked(await query.in('id',[...new Set(ids)]));
 return Promise.all(rows.map(async(book:any)=>{let coverUrl=null;if(book.cover_path&&book.cover_status==='ready'){const {data}=await db.storage.from('private-books').createSignedUrl(book.cover_path,3600);coverUrl=data?.signedUrl||null;}return {id:book.id,title:book.title,author:book.author,coverUrl,visibility:book.visibility,archived:!!book.archived_at};}));
}
async function presentGuide(row:any){
 const {cover_path,cover_design,cover_usage,...safe}=row;
 let src=null;if(row.cover_status==='ready'&&cover_path){const {data}=await db.storage.from('private-books').createSignedUrl(cover_path,3600);src=data?.signedUrl||null;}
 return {...safe,cover:{src,status:row.cover_status||'none',label:cover_design?.label||'',topic:cover_design?.topic||'',background:cover_design?.background||'#e5e2d9',version:cover_design?.version||'editorial-v1'}};
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':allowed.has(origin)?origin:'https://answerwithbooks.com','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,HEAD,POST,OPTIONS'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{headers,status});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 // GET is a read-only, public-document route. No bearer can broaden its scope.
 if(req.method==='GET'||req.method==='HEAD'){
  const match=new URL(req.url).pathname.match(/\/reading-guides\/([a-f0-9-]+)\.md$/i);
  const id=match?.[1];if(!uuid(id))return reply({error:'Guide not found.'},404);
  try{
   const row=checked(await db.from('reading_guides').select('id,question,book_ids,guide').eq('id',id).eq('visibility','public').eq('status','ready').maybeSingle());
   if(!row?.guide)return reply({error:'Guide not found.'},404);
   const guide=await hydrateReading(row.guide,await sourceBooks(db,null,row.book_ids),hash);
   return new Response(req.method==='HEAD'?null:guideMarkdown(row,guide),{headers:{...headers,'Content-Type':'text/markdown; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});
  }catch{return reply({error:'This reading is temporarily unavailable.'},503);}
 }
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(origin&&!allowed.has(origin))return reply({error:'Origin not allowed'},403);
 try{
  const raw=await req.text();if(raw.length>4300000)return reply({error:'Request too large'},413);
  let input;try{input=JSON.parse(raw);}catch{return reply({error:'Send a JSON object.'},400);}
  if(!input||typeof input!=='object'||Array.isArray(input))return reply({error:'Send a JSON object.'},400);
  if(input.action!=='cover-import'&&raw.length>10000)return reply({error:'Request too large'},413);
  const bearer=req.headers.get('authorization')?.replace(/^Bearer /i,'')||'';
  if(input.action==='drain'){
   const runner=Deno.env.get('BOOK_QUEUE_RUNNER_SECRET');
   if(!runner||await hash(new TextEncoder().encode(bearer))!==await hash(new TextEncoder().encode(runner)))return reply({error:'Not authorized'},403);
   const result=await drainGuide(db,createBookModelClient({getEnv:(n:string)=>Deno.env.get(n)}),hash,(design:any)=>generateGuideCover(design,{getEnv:(n:string)=>n==='GUIDE_COVER_MODEL'?'gpt-image-1.5':Deno.env.get(n)}),{getEnv:(n:string)=>Deno.env.get(n)});
   checked(await db.rpc('wake_reading_guides',{p_count:1}));return reply(result||{idle:true});
  }
  if(input.action==='public-list'){
   const rows=checked(await db.from('reading_guides').select('id,question,created_at,cover_path,cover_status,cover_design,book_ids').eq('visibility','public').eq('status','ready').order('created_at',{ascending:false}).limit(100));
   return reply({guides:await Promise.all(rows.map(presentGuide))});
  }
  if(input.action==='suggest')return reply({error:'Start a passage-first recommendation with action propose and a requestKey, then poll the saved guide.',code:'USE_PASSAGE_PROPOSAL'},409);
  const user=bearer?await bookUser(db,bearer):null;
  if(input.action==='get'&&uuid(input.id)){
   const shared=checked(await db.from('reading_guides').select('id,question,status,length,book_ids,guide,created_at,cover_path,cover_status,cover_design,visibility').eq('id',input.id).eq('visibility','public').eq('status','ready').maybeSingle());
   if(shared){
    shared.guide=await hydrateReading(shared.guide,await sourceBooks(db,null,shared.book_ids),hash);
    const state=user?checked(await db.from('reader_guide_state').select('position,completed').eq('user_id',user.id).eq('guide_id',shared.id).maybeSingle()):null;
    return reply({guide:await presentGuide({...shared,position:state?.position||0,completed:state?.completed||false}),books:await displayBooks(null,shared.book_ids)});
   }
  }
  if(!user)return reply({error:'Sign in to read your guides.'},401);
  const owned=()=>db.from('reading_guides').select('*').eq('user_id',user.id).eq('id',input.id).maybeSingle();
  if(input.action==='list'){
   const [guideResult,stateResult]=await Promise.all([
    db.from('reading_guides').select('id,question,status,length,book_ids,proposal,error,position,completed,created_at,cover_status,cover_path,cover_design').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100),
    db.from('reader_guide_state').select('guide_id,hidden,position,completed').eq('user_id',user.id)
   ]);
   const states=new Map(checked(stateResult).map((state:any)=>[state.guide_id,state]));
   const visible=checked(guideResult).filter((g:any)=>!(states.get(g.id) as any)?.hidden);
   const [guides,books]=await Promise.all([
    Promise.all(visible.map((g:any)=>{const state=states.get(g.id) as any;return presentGuide(state?{...g,position:state.position,completed:state.completed}:g);})),
    input.includeBooks===false?Promise.resolve([]):displayBooks(user.id,visible.flatMap((g:any)=>g.book_ids||[]))
   ]);
   return reply({guides,books});
  }
  if(input.action==='create'){
   if(typeof input.question!=='string'||input.question.trim().length<3||input.question.length>2000||!uuid(input.requestKey)||!['short','standard','long'].includes(input.length))return reply({error:'Check your question and reading time.'},400);
   if(!Array.isArray(input.bookIds)||input.bookIds.length<1||input.bookIds.length>4||input.bookIds.some((id:unknown)=>!uuid(id))||new Set(input.bookIds).size!==input.bookIds.length)return reply({error:'Confirm one to four different books.'},400);
   let existing=checked(await db.from('reading_guides').select('id,status').eq('user_id',user.id).eq('request_key',input.requestKey).maybeSingle());
   if(existing&&['composing','ready'].includes(existing.status))return reply({id:existing.id});
   if(!existing){
    const available=checked(await db.from('book_processing_jobs').select('id').eq('visibility','public').eq('status','ready').eq('is_current',true).eq('deletion_pending',false).is('archived_at',null).is('duplicate_of',null).in('id',input.bookIds));
    if(available.length!==input.bookIds.length)return reply({error:'A selected book is no longer available. Update your books.'},409);
    if(!checked(await db.rpc('consume_reading_request',{p_user:user.id})))return reply({error:'You have reached today’s reading limit. Please try again later.'},429);
    const result=await db.from('reading_guides').insert({user_id:user.id,question:input.question.trim(),request_key:input.requestKey,visibility:'public',status:'awaiting_confirmation',book_ids:input.bookIds,proposal:{bookIds:input.bookIds,connection:'Books confirmed by the reader.'},progress:{}}).select('id').single();
    if(result.error?.code==='23505')existing=checked(await db.from('reading_guides').select('id,status').eq('user_id',user.id).eq('request_key',input.requestKey).single());else existing=checked(result);
   }
   const confirmation=await db.rpc('confirm_reader_guide',{p_user:user.id,p_id:existing.id,p_length:input.length});
   if(confirmation.error){const code=confirmation.error.message.includes('FREE_GUIDE_LIMIT')?'FREE_GUIDE_LIMIT':confirmation.error.message.includes('GUIDE_LIMIT')?'GUIDE_LIMIT':'';return reply({error:code?'Your monthly guide allowance is used.':'Could not confirm this guide. Please retry.',...(code?{code}:{})},code==='FREE_GUIDE_LIMIT'?402:code?429:409);}
   checked(await db.rpc('wake_reading_guides',{p_count:1}));return reply({id:existing.id},202);
  }
  if(['propose','answer'].includes(input.action)){
   if(typeof input.question!=='string'||input.question.trim().length<3||input.question.length>2000)return reply({error:'Enter a question between 3 and 2,000 characters.'},400);
   if(input.action==='propose'){
    if(!uuid(input.requestKey))return reply({error:'A request identity is required.'},400);
    const existing=checked(await db.from('reading_guides').select('id').eq('user_id',user.id).eq('request_key',input.requestKey).maybeSingle());if(existing)return reply(existing);
   }
   if(input.action==='propose'&&input.bookIds!==undefined){
    if(!Array.isArray(input.bookIds)||input.bookIds.length<1||input.bookIds.length>4||input.bookIds.some((id:unknown)=>!uuid(id))||new Set(input.bookIds).size!==input.bookIds.length)return reply({error:'Choose one to four different books.'},400);
    const available=checked(await db.from('book_processing_jobs').select('id').eq('visibility','public').eq('status','ready').eq('is_current',true).is('archived_at',null).is('duplicate_of',null).in('id',input.bookIds));
    if(available.length!==input.bookIds.length)return reply({error:'An original text is not ready in the shared library. Add the source before creating this reading.'},409);
   }
   if(input.action==='propose'){
    const plan=checked(await db.rpc('reader_plan',{p_user:user.id}));
    if(plan.used>=plan.limit)return reply(plan.active?{error:'You have used this billing month’s 30 guides. Your saved guides remain available.',code:'GUIDE_LIMIT'}:{error:'You have used your 3 free guides this month. Upgrade for 30 guides per billing month, or wait for your free allowance to reset.',code:'FREE_GUIDE_LIMIT'},plan.active?429:402);
   }
   const permitted=checked(await db.rpc('consume_reading_request',{p_user:user.id}));if(!permitted)return reply({error:'You have reached today’s reading limit. Your saved guides remain available.'},429);
   if(input.action==='answer')return reply(await answerGuides(db,user.id,input.question,createBookModelClient({getEnv:(n:string)=>Deno.env.get(n)}),hash));
   const result=await db.from('reading_guides').insert({user_id:user.id,question:input.question.trim(),request_key:input.requestKey,visibility:'public',...(input.bookIds?{progress:{libraryIds:input.bookIds,requiredBookIds:input.bookIds}}:{})}).select('id').single();
   if(result.error?.code==='23505')return reply(checked(await db.from('reading_guides').select('id').eq('user_id',user.id).eq('request_key',input.requestKey).single()));
   const guide=checked(result);checked(await db.rpc('wake_reading_guides',{p_count:1}));return reply(guide,202);
  }
  if(!uuid(input.id))return reply({error:'Invalid guide identity'},400);
  let row=checked(await owned());if(!row&&['context','position','feedback'].includes(input.action))row=checked(await db.from('reading_guides').select('*').eq('id',input.id).eq('visibility','public').eq('status','ready').maybeSingle());if(!row)return reply({error:'Guide not found'},404);
  if(input.action==='usage'){const rows=checked(await db.from('guide_provider_usage').select('model,stage,state,cost_usd,upper_usd,metric,created_at').eq('guide_id',row.id));return reply({budgetUsd:row.provider_budget_usd,recordedUsd:rows.reduce((n:number,r:any)=>n+Number(r.cost_usd||0),0),unresolvedReservations:rows.filter((r:any)=>r.state!=='settled').length,operations:rows,notice:'Provider estimates, not a customer invoice. Older guides may have incomplete usage.'});}
  if(input.action==='cover')return reply({cover:(await presentGuide(row)).cover});
  if(input.action==='cover-import'){
   if(row.status!=='ready'||row.lease_until&&Date.parse(row.lease_until)>Date.now())return reply({error:'Wait for this guide to finish processing.'},409);
   let design,bytes;try{design=validateGuideCoverDesign(input.design);bytes=decodeImportedGuideCover(input.image);}catch{return reply({error:'Supply a valid cover design and a PNG under 3 MB.'},400);}
   const path=`${user.id}/reading-guides/${row.id}/cover-${guideCoverVersion}-${crypto.randomUUID()}.png`;
   checked(await db.storage.from('private-books').upload(path,bytes,{contentType:'image/png',upsert:false}));
   const saved=checked(await db.from('reading_guides').update({cover_path:path,cover_design:design,cover_status:'ready',cover_usage:{provider:'built-in-imagegen'},updated_at:new Date().toISOString()}).eq('id',row.id).eq('user_id',user.id).is('lease_token',null).select('id').maybeSingle());
   if(!saved){await db.storage.from('private-books').remove([path]);return reply({error:'A cover is already being processed. Try again shortly.'},409);}
   if(row.cover_path?.startsWith(`${user.id}/reading-guides/${row.id}/`))await db.storage.from('private-books').remove([row.cover_path]);
   return reply({saved:true});
  }
  if(input.action==='get'){
   const {progress,lease_token,lease_until,...safe}=row;
   if(row.status==='scanning'&&Array.isArray(progress?.libraryIds))safe.searchProgress={checked:Math.min(progress.offset||0,progress.libraryIds.length),total:progress.libraryIds.length};
   if(row.status==='ready'){try{safe.guide=await hydrateReading(row.guide,await sourceBooks(db,user.id,row.book_ids,{savedReading:true}),hash);}catch{safe.guide=null;safe.error='A source for this reading is no longer available.';}}
   return reply({guide:await presentGuide(safe),books:await displayBooks(user.id,row.book_ids||[],row.status==='ready')});
  }
  if(input.action==='confirm'){
   if(!['short','standard','long'].includes(input.length))return reply({error:'Choose a reading length.'},400);
   if(row.status!=='awaiting_confirmation')return ['composing','ready'].includes(row.status)?reply({id:row.id}):reply({error:'Wait for the suggested books first.'},409);
   const confirmation=await db.rpc('confirm_reader_guide',{p_user:user.id,p_id:row.id,p_length:input.length});
   if(confirmation.error){
    const message=confirmation.error.message;
    if(message.includes('FREE_GUIDE_LIMIT'))return reply({error:'You have used your 3 free guides this month. Upgrade or wait for your allowance to reset.',code:'FREE_GUIDE_LIMIT'},402);
    if(message.includes('GUIDE_LIMIT'))return reply({error:'Your 30 guides for this billing month are already used.',code:'GUIDE_LIMIT'},429);
    return reply({error:'Could not confirm this guide. Please try again.'},409);
   }
   checked(await db.rpc('wake_reading_guides',{p_count:1}));return reply({id:row.id},202);
  }
  if(input.action==='feedback'){
   if(row.status!=='ready')return reply({error:'Finish processing this guide first.'},409);
   if(!['helpful','not_helpful'].includes(input.sentiment)||typeof input.comment!=='string'||input.comment.length>2000)return reply({error:'Choose a response and keep your note under 2,000 characters.'},400);
   if(row.visibility==='public'){checked(await db.from('reader_guide_state').upsert({user_id:user.id,guide_id:row.id,feedback:{sentiment:input.sentiment,comment:input.comment.trim(),submitted_at:new Date().toISOString()}},{onConflict:'user_id,guide_id'}));return reply({saved:true});}
   checked(await db.from('reading_guides').update({feedback:{sentiment:input.sentiment,comment:input.comment.trim(),submitted_at:new Date().toISOString()}}).eq('id',row.id).eq('user_id',user.id));return reply({saved:true});
  }
  if(input.action==='position'){
   if(!Number.isInteger(input.position)||input.position<0||input.position>(row.guide?.sections?.length||0))return reply({error:'Invalid reading position'},400);
   if(row.visibility==='public'){checked(await db.from('reader_guide_state').upsert({user_id:user.id,guide_id:row.id,position:input.position,...(input.completed===true?{completed:true}:{})},{onConflict:'user_id,guide_id'}));return reply({saved:true});}
   checked(await db.from('reading_guides').update({position:input.position,...(input.completed===true?{completed:true}:{})}).eq('id',row.id).eq('user_id',user.id));return reply({saved:true});
  }
  if(input.action==='context'){
   if(row.visibility==='public'&&!checked(await db.rpc('reader_plan',{p_user:user.id})).active)return reply({error:'Subscribe to read additional source context through the skill.'},402);
   if(!Number.isInteger(input.sectionIndex)||input.sectionIndex<0)return reply({error:'Invalid passage'},400);
   const section=row.guide?.sections?.[input.sectionIndex];if(!section)return reply({error:'Passage not found'},404);
   const [book]=await sourceBooks(db,user.id,[section.bookId],{savedReading:row.visibility!=='public'});if(!book)return reply({error:'Source no longer available'},404);
   const startLine=Math.max(1,section.startLine-30),endLine=Math.min(book.source_text.split('\n').length,section.endLine+30);
   return reply({title:book.title,startLine,endLine,text:sourceSpan(book,{startLine,endLine})});
  }
  if(input.action==='delete'){if(row.visibility==='public'&&row.status==='ready'){checked(await db.from('reader_guide_state').upsert({user_id:user.id,guide_id:row.id,hidden:true},{onConflict:'user_id,guide_id'}));return reply({deleted:true});}checked(await db.from('reading_guides').delete().eq('id',row.id).eq('user_id',user.id));return reply({deleted:true});}
  return reply({error:'Unknown guide action'},400);
 }catch(error){console.error('reading_request_failed',error instanceof Error?error.name:'Error');return reply({error:'Could not complete this reading request. Please try again.'},500);}
});
