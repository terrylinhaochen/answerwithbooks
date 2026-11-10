// Actual Edge handler with a transport fake: no live account, source or provider access.
import assert from 'node:assert/strict';
Deno.env.set('SUPABASE_URL','https://reading-test.invalid');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','synthetic-service');
const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',id='00000000-0000-4000-8000-000000000003';
let testPlan={active:true,used:0,limit:30};
let suggestionAllowed=true,modelCalls=0;
Deno.env.set('BOOK_PROCESSING_MODEL','gpt-4.1-mini');Deno.env.set('OPENAI_API_KEY','fixture');
let archivedSource=false,deletingSource=false,bookReads=0;
let handler:any;Deno.serve=((h:any)=>{handler=h;return {} as any;}) as typeof Deno.serve;
let rows:any[]=[{id,user_id:owner,question:'What is worth doing?',status:'awaiting_confirmation',book_ids:[],proposal:{bookIds:[]},progress:{internal:'private'},lease_token:'secret'}],wakes=0;
const json=(v:any,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
globalThis.fetch=async(input:any,init?:RequestInit)=>{const req=new Request(input,init),url=new URL(req.url);if(url.hostname==='api.openai.com'){modelCalls++;return json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({bookIds:['00000000-0000-4000-8000-000000000004'],connection:'A useful starting point.',gap:''})}}]});}assert.equal(url.hostname,'reading-test.invalid');
 if(url.pathname==='/auth/v1/user')return req.headers.get('authorization')==='Bearer owner'?json({id:owner}):req.headers.get('authorization')==='Bearer other'?json({id:other}):json({message:'Unauthorized'},401);
 if(url.pathname==='/rest/v1/rpc/wake_reading_guides'){wakes++;return json(null);}
 if(url.pathname==='/rest/v1/rpc/consume_guide_suggestion'){const body=await req.json();assert.match(body.p_bucket,/^[a-f0-9]{64}$/);return json(suggestionAllowed);}
 if(url.pathname==='/rest/v1/rpc/reader_plan')return json(testPlan);
 if(url.pathname==='/rest/v1/rpc/consume_reading_request')return json(true);
 if(url.pathname==='/rest/v1/book_processing_jobs'){
  bookReads++;
  if(archivedSource){
   assert.equal(url.searchParams.get('deletion_pending'),'eq.false');
   const allowed=url.searchParams.get('or')===`(user_id.eq.${owner},and(visibility.eq.public,archived_at.is.null))`;
   if(!allowed||deletingSource)return json([]);
   return json([{id:'book-owned',title:'Owned book',author:'Writer',visibility:'private',archived_at:'2026-11-06T00:00:00Z',source_text:'Original archived passage.',cover_status:'none'}]);
  }
  if(url.searchParams.get('select')==='id,title,author,artifacts'){assert.equal(url.searchParams.get('visibility'),'eq.public');assert.equal(url.searchParams.get('archived_at'),'is.null');assert.equal(url.searchParams.get('deletion_pending'),'eq.false');return json([{id:'00000000-0000-4000-8000-000000000004',title:'Public source',artifacts:{}}]);}
  if(url.searchParams.get('or')==='(visibility.eq.public)')return json([{id:'00000000-0000-4000-8000-000000000004',title:'Public source',cover_status:'none'}]);
  if(url.searchParams.get('visibility')==='eq.public'){assert.equal(url.searchParams.get('status'),'eq.ready');assert.equal(url.searchParams.get('is_current'),'eq.true');assert.equal(url.searchParams.get('duplicate_of'),'is.null');return json(url.searchParams.get('id')?.includes('00000000-0000-4000-8000-000000000004')?[{id:'00000000-0000-4000-8000-000000000004'}]:[]);}

  assert.equal(url.searchParams.get('or'),`(visibility.eq.public,user_id.eq.${owner})`);
  assert.equal(url.searchParams.get('archived_at'),'is.null');
  return json([{id:'book-owned',title:'Owned book',author:'Writer',cover_path:'owner/book/cover.png',cover_status:'ready'}]);
 }
 if(url.pathname==='/storage/v1/object/sign/private-books/owner/book/cover.png')return json({signedURL:'/object/sign/private-books/owner/book/cover.png?token=fixture'});
 if(url.pathname==='/rest/v1/reader_guide_state')return json([]);
 if(url.pathname==='/rest/v1/rpc/confirm_reader_guide'){const body=await req.json();const row=rows.find(r=>r.id===body.p_id&&r.user_id===body.p_user);if(testPlan.used>=testPlan.limit)return json({message:'FREE_GUIDE_LIMIT'},400);row.status='composing';row.length=body.p_length;return json(row.id);}
 if(url.pathname==='/rest/v1/reading_guides'){
  if(req.method==='POST'){const row={...await req.json(),id:crypto.randomUUID()};rows.push(row);return json({id:row.id});}
  const selected=rows.filter(row=>[...url.searchParams].every(([k,v])=>!v.startsWith('eq.')||String(row[k])===v.slice(3)));
  if(req.method==='PATCH'){const patch=await req.json();selected.forEach(r=>Object.assign(r,patch));}
  if(req.method==='DELETE')rows=rows.filter(r=>!selected.includes(r));
  if(url.searchParams.get('select')==='id'&&req.headers.get('prefer')?.includes('count=exact')){assert.equal(url.searchParams.get('status'),'eq.awaiting_confirmation');assert.ok(url.searchParams.get('user_id'));return new Response(JSON.stringify(selected.slice(0,1).map(r=>({id:r.id}))),{headers:{'Content-Type':'application/json','Content-Range':`0-0/${selected.length}`}});}
  const single=req.headers.get('accept')?.includes('application/vnd.pgrst.object+json');return single?selected.length===1?json(selected[0]):json({code:'PGRST116',details:'The result contains 0 rows'},406):json(selected);
 }throw Error('Unexpected transport: '+req.url);
};
await import('../supabase/functions/reading-guides/index.ts');
const call=(body:any,token='owner',origin='https://answerwithbooks.com')=>handler(new Request('https://reading-test.invalid/function',{method:'POST',headers:{authorization:'Bearer '+token,origin,'Content-Type':'application/json'},body:JSON.stringify(body)}));
assert.equal((await call({action:'get',id},'invalid')).status,401);
assert.equal((await call({action:'get',id},'other')).status,404);
assert.equal((await call({action:'confirm',id,length:'short'},'other')).status,404);
assert.equal((await call({action:'delete',id},'other')).status,404);
assert.equal((await call({action:'list'},'owner','https://evil.invalid')).status,403);
// Reminders expose only a count and one owned ID; no questions, passages or work starts.
const inputWakes=wakes,inputReads=bookReads;
assert.equal((await call({action:'input-status'},'invalid')).status,401);
assert.equal((await call({action:'input-status'},'owner','https://evil.invalid')).status,403);
assert.deepEqual(await (await call({action:'input-status'},'other')).json(),{count:0,guideId:null});
rows.push({id:'other-private',user_id:other,status:'awaiting_confirmation',question:'Private other question'}, {id:'another-pending',user_id:owner,status:'awaiting_confirmation'}, {id:'already-running',user_id:owner,status:'composing'});
assert.deepEqual(await (await call({action:'input-status'})).json(),{count:2,guideId:id});
assert.equal(bookReads,inputReads);assert.equal(wakes,inputWakes);assert.equal(modelCalls,0);
rows=rows.filter(row=>row.id===id);
console.log('PASS input reminders: owner-only pending count, no source reads, no generation, no private fields.');
rows[0].book_ids=['book-owned'];
const safe=await (await call({action:'get',id})).json();assert.equal(safe.guide.lease_token,undefined);assert.equal(safe.guide.progress,undefined);assert.equal(safe.books[0].title,'Owned book');assert.match(safe.books[0].coverUrl,/token=fixture/);assert.equal(safe.books[0].cover_path,undefined);
assert.equal((await call({action:'confirm',id,length:'arbitrary'})).status,400);
assert.equal((await call({action:'confirm',id,length:'short'})).status,202);assert.equal(rows[0].status,'composing');assert.equal(wakes,1);
assert.equal((await call({action:'confirm',id,length:'long'})).status,200);assert.equal(rows[0].length,'short');assert.equal(wakes,1);
assert.equal((await call({action:'position',id,position:-1})).status,400);
rows[0].status='ready';assert.equal((await call({action:'cover-import',id,image:'bad',design:{}},'other')).status,404);assert.equal((await call({action:'cover-import',id,image:'bad',design:{}})).status,400);
assert.equal((await call({action:'feedback',id,sentiment:'helpful',comment:'A private note'},'other')).status,404);
assert.equal((await call({action:'feedback',id,sentiment:'bad',comment:''})).status,400);
assert.equal((await call({action:'feedback',id,sentiment:'helpful',comment:'x'.repeat(2001)})).status,400);
assert.equal((await call({action:'feedback',id,sentiment:'helpful',comment:'A private note'})).status,200);
assert.equal(rows[0].feedback.comment,'A private note');
assert.equal((await call({action:'feedback',id,sentiment:'not_helpful',comment:'Updated note'})).status,200);
assert.equal(rows[0].feedback.comment,'Updated note');
archivedSource=true;
rows[0].guide={introduction:'Before',conclusion:'After',sections:[{bookId:'book-owned',startLine:1,endLine:1}]};
const archived=await (await call({action:'get',id})).json();
assert.equal(archived.guide.guide.sections[0].text,'Original archived passage.');assert.equal(archived.books[0].archived,true);
assert.equal((await call({action:'get',id},'other')).status,404);
assert.equal((await (await call({action:'context',id,sectionIndex:0})).json()).text,'Original archived passage.');
deletingSource=true;const unavailable=await (await call({action:'get',id})).json();assert.equal(unavailable.guide.guide,null);deletingSource=false;
const beforeList=bookReads;const compact=await (await call({action:'list',includeBooks:false})).json();assert.equal(compact.guides.length,1);assert.equal(bookReads,beforeList);
archivedSource=false;
console.log('PASS archived owner source remains readable; other owners and pending deletion are denied; compact shelf skips source and book-cover reads.');
assert.equal((await call({action:'delete',id})).status,200);assert.equal(rows.length,0);
console.log('Reading HTTP: auth, ownership, CORS, private fields, confirmation idempotency, positions and deletion passed.');

const chosen='00000000-0000-4000-8000-000000000004',missing='00000000-0000-4000-8000-000000000005';
for(const bookIds of [[chosen,chosen],['invalid'],[],[chosen,missing]]){const response=await call({action:'propose',question:'A question about a life',requestKey:crypto.randomUUID(),bookIds});assert.equal(response.status,bookIds.includes(missing)?409:400);}
const key=crypto.randomUUID();const started=await call({action:'propose',question:'A question about a life',requestKey:key,bookIds:[chosen]});assert.equal(started.status,202);const saved=rows.find(r=>r.request_key===key);assert.deepEqual(saved.progress,{libraryIds:[chosen],requiredBookIds:[chosen]});assert.equal(saved.visibility,'public');assert.equal((await call({action:'propose',question:'A question about a life',requestKey:key,bookIds:[chosen]})).status,200);
console.log('PASS selected-book proposals: exact public ready editions, invalid/duplicate/missing rejection, persisted source scope and idempotent retry');

// Free accounts may propose; the fourth request fails before creating a job.
testPlan={active:false,used:0,limit:3};
assert.equal((await call({action:'propose',question:'A free reading question',requestKey:crypto.randomUUID(),bookIds:[chosen]})).status,202);
testPlan.used=3;const rowCount=rows.length;
const exhausted=await call({action:'propose',question:'One more free question',requestKey:crypto.randomUUID(),bookIds:[chosen]});
assert.equal(exhausted.status,402);assert.equal((await exhausted.json()).code,'FREE_GUIDE_LIMIT');assert.equal(rows.length,rowCount);
console.log('PASS free account proposal accepted; exhausted free tier returns upgrade state without adding a job.');

// Retired overview-only suggestions cannot silently bypass the passage-first queue.
const legacy=await call({action:'suggest',question:'What is worth doing?'},'invalid');assert.equal(legacy.status,409);assert.equal((await legacy.json()).code,'USE_PASSAGE_PROPOSAL');assert.equal(modelCalls,0);
// Confirmed selections create directly, with auth, availability, quota and idempotency.
assert.equal((await call({action:'create',question:'What is worth doing?',bookIds:[chosen],requestKey:crypto.randomUUID(),length:'short'},'invalid')).status,401);
testPlan={active:false,used:0,limit:3};
for(const bookIds of [[],[chosen,chosen],[missing]])assert.equal((await call({action:'create',question:'What is worth doing?',bookIds,requestKey:crypto.randomUUID(),length:'short'})).status,bookIds.includes(missing)?409:400);
const createKey=crypto.randomUUID(),createInput={action:'create',question:'What is worth doing?',bookIds:[chosen],requestKey:createKey,length:'short'};
assert.equal((await call(createInput)).status,202);const direct=rows.find(r=>r.request_key===createKey);assert.equal(direct.status,'composing');assert.deepEqual(direct.book_ids,[chosen]);assert.equal(direct.length,'short');
const countAfterCreate=rows.length;assert.equal((await call(createInput)).status,200);assert.equal(rows.length,countAfterCreate);
testPlan.used=3;const capped=await call({...createInput,requestKey:crypto.randomUUID()});assert.equal(capped.status,402);assert.equal((await capped.json()).code,'FREE_GUIDE_LIMIT');
console.log('PASS legacy overview endpoint is retired; direct confirmed creation enforces auth, source scope, quota and idempotency.');
testPlan.used=0;
assert.equal(direct.is_private,false,'guides are public unless the reader opts out');
assert.equal((await call({...createInput,requestKey:crypto.randomUUID(),private:'yes'})).status,400);
const privateKey=crypto.randomUUID();assert.equal((await call({...createInput,requestKey:privateKey,private:true})).status,202);
const hidden=rows.find(r=>r.request_key===privateKey);assert.equal(hidden.is_private,true);assert.equal(hidden.visibility,'public','privacy must not change the source scope');
Object.assign(hidden,{status:'ready',guide:{sections:[]},cover_status:'none'});Object.assign(direct,{status:'ready',guide:{sections:[]},cover_status:'none'});
const listed=(await (await call({action:'public-list'},'other')).json()).guides.map((g:any)=>g.id);
assert.ok(listed.includes(direct.id));assert.ok(!listed.includes(hidden.id),'private guides stay out of All guides');
for(const action of ['get','position','feedback','context'])assert.equal((await call({action,id:hidden.id,position:0,sectionIndex:0,sentiment:'helpful',comment:''},'other')).status,404,`others cannot ${action} a private guide`);
hidden.book_ids=[];assert.equal((await call({action:'get',id:hidden.id})).status,200,'the owner can still read it');
assert.equal((await (await call({action:'list'})).json()).guides.find((g:any)=>g.id===hidden.id).is_private,true);
assert.equal((await call({action:'delete',id:hidden.id})).status,200);assert.ok(!rows.includes(hidden),'deleting a private guide removes it rather than hiding it');
console.log('PASS private guides: public by default, opt-in privacy keeps source scope, hidden from other readers and the catalog, owner-only access and deletion.');
