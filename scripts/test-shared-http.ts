import assert from 'node:assert/strict';
Deno.env.set('SUPABASE_URL','https://shared-test.invalid');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','fixture');
const owner='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';let rpcReady=true,active=false,handler:any,catalogCount=23,countFailed=false;
Deno.serve=((h:any)=>{handler=h;return {} as any;}) as typeof Deno.serve;
const source='Original source line.\n'.repeat(700),book={id,title:'Shared example',author:'Example writer',status:'ready',run_state:'complete',visibility:'public',user_id:owner,source_text:source,source_sha:'secret-hash',source_import:{state:'complete',originalBytes:100,metadata:{private:'do not expose'}},artifacts:{'reading/map.json':JSON.stringify({orientation:'Who this writer is.',summary:'A book introduction.',questions:[{question:'What matters?',contribution:'A scene.'}],sections:[{title:'A chapter',sourceRefs:[{startLine:1,endLine:40}]}]})}};
const json=(v:any,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
globalThis.fetch=async(input:any,init?:RequestInit)=>{const req=new Request(input,init),url=new URL(req.url);assert.equal(url.hostname,'shared-test.invalid');
 if(url.pathname==='/auth/v1/user')return req.headers.get('authorization')==='Bearer subscriber'?json({id:owner}):json({message:'Unauthorized'},401);
 if(url.pathname==='/rest/v1/rpc/reader_plan')return json({active});
 if(url.pathname==='/rest/v1/rpc/public_catalog_compact'){const body=await req.json();assert.deepEqual(body,{p_offset:0,p_limit:50});if(!rpcReady)return json({code:'PGRST202',message:'not found'},404);return json([{id,title:book.title,author:book.author,status:'ready',run_state:'complete',cover_status:null,cover_path:null,source_import:{state:'complete'},cursor:book.cursor,total_sections:book.total_sections,duplicate_of:null,orientation:'Who this writer is.',questions:JSON.parse(book.artifacts['reading/map.json']).questions}]);}
 if(url.pathname==='/rest/v1/book_processing_jobs'){
  const single=req.headers.get('accept')?.includes('application/vnd.pgrst.object+json');
  assert.equal(url.searchParams.get('visibility'),'eq.public');
  if(req.method==='HEAD'){
   assert.equal(url.searchParams.get('status'),'eq.ready');assert.equal(url.searchParams.get('duplicate_of'),'is.null');
   assert.equal(url.searchParams.get('select'),'id');assert.equal(url.searchParams.has('limit'),false);
   assert.match(req.headers.get('prefer')||'',/count=exact/);
   return new Response(null,{status:countFailed?500:200,headers:{'Content-Range':`*/${catalogCount}`}});
  }
  if(url.searchParams.get('status')==='neq.ready'){
   // The uploader's own in-progress books only.
   assert.equal(url.searchParams.get('user_id'),`eq.${owner}`);assert.equal(url.searchParams.get('deletion_pending'),'eq.false');assert.equal(url.searchParams.get('archived_at'),'is.null');assert.equal(url.searchParams.get('duplicate_of'),'is.null');assert.match(url.searchParams.get('created_at')||'',/^gte\./);
   return json([{...book,id:'00000000-0000-4000-8000-000000000004',status:'processing',run_state:'running',cursor:2,total_sections:5}]);
  }
  if(!url.searchParams.has('id')){assert.equal(url.searchParams.get('status'),'eq.ready');assert.equal(url.searchParams.get('duplicate_of'),'is.null');}
  if(url.searchParams.get('id')==='eq.00000000-0000-4000-8000-000000000003')return json({code:'PGRST116',details:'The result contains 0 rows'},406);
  return single?json(book):json([book]);
 }
 throw Error('Unexpected request '+url.pathname);
};
await import('../supabase/functions/shared-library/index.ts');
const call=(body:any,token='',origin='https://answerwithbooks.com')=>handler(new Request('https://shared-test.invalid/function',{method:'POST',headers:{authorization:'Bearer '+token,origin},body:JSON.stringify(body)}));
assert.equal((await (await call({action:'list'})).json()).books.length,1);
const publicBook=await (await call({action:'get',id})).json();assert.equal(publicBook.book.title,'Shared example');for(const field of ['source_text','source_sha','user_id','source_import','artifacts'])assert.equal(publicBook.book[field],undefined);
assert.equal((await call({action:'get',id:'00000000-0000-4000-8000-000000000003'})).status,404);
assert.equal((await call({action:'source',id})).status,401);assert.equal((await call({action:'source',id},'subscriber')).status,402);
active=true;const text=await (await call({action:'source',id,startLine:5,endLine:7},'subscriber')).json();assert.equal(text.text,'Original source line.\nOriginal source line.\nOriginal source line.');assert.equal(text.startLine,5);assert.equal(text.endLine,7);
assert.equal((await call({action:'source',id,startLine:1,endLine:501},'subscriber')).status,400);assert.equal((await call({action:'get',id},'subscriber','https://evil.invalid')).status,403);
rpcReady=false;const fallback=(await (await call({action:'list',compact:true})).json()).books[0];rpcReady=true;
const full=(await (await call({action:'list'})).json()).books[0],compact=(await (await call({action:'list',compact:true})).json()).books[0];
assert.ok('summary' in full&&'chapters' in full);assert.ok(!('summary' in compact)&&!('chapters' in compact),'compact catalog omits long text');assert.deepEqual(compact,fallback,'database function and fallback give the same card');assert.equal(compact.orientation,full.orientation);assert.deepEqual(compact.questions,full.questions);
assert.equal((await call({action:'uploads'})).status,401,'uploads need sign-in');
const uploads=(await (await call({action:'uploads'},'subscriber')).json()).books;assert.equal(uploads.length,1);assert.equal(uploads[0].stage,'reading');assert.deepEqual(uploads[0].progress,{completed:2,total:5});
console.log('PASS compact catalog and owner-only processing uploads.');
await import('../supabase/functions/library-count/index.ts');
for(const count of [23,51,0]){catalogCount=count;const response=await call({});assert.equal(response.status,200);assert.deepEqual(await response.json(),{count});}
countFailed=true;assert.equal((await call({})).status,503);countFailed=false;
assert.equal((await call({},'','https://evil.invalid')).status,403);
assert.equal((await handler(new Request('https://shared-test.invalid/function'))).status,405);
console.log('PASS live catalog totals beyond one page, count failures, anonymous catalog, explicit public projection, private ID hiding, subscriber-only source spans, 500-line bounds and CORS');
