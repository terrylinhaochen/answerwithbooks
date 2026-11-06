import assert from 'node:assert/strict';
Deno.env.set('SUPABASE_URL','https://markdown-test.invalid');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','fixture-service');
let handler:any;Deno.serve=((h:any)=>{handler=h;return {} as any;}) as typeof Deno.serve;
const id='00000000-0000-4000-8000-000000000001';
let visibility='public',status='ready',available=true;
const guide={id,question:'What is worth doing?',visibility,status,book_ids:['source'],guide:{introduction:'An introduction.',conclusion:'A conclusion.',sections:[{bookId:'source',startLine:1,endLine:2,heading:'The beginning',before:'Before.',after:'After.'}]}};
const json=(data:unknown)=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
globalThis.fetch=async(input:any,init?:RequestInit)=>{
 const req=new Request(input,init),url=new URL(req.url);assert.equal(url.hostname,'markdown-test.invalid');
 if(url.pathname==='/rest/v1/reading_guides'){
  assert.equal(url.searchParams.get('visibility'),'eq.public');assert.equal(url.searchParams.get('status'),'eq.ready');
  return json(visibility==='public'&&status==='ready'&&url.searchParams.get('id')===`eq.${id}`?guide:null);
 }
 if(url.pathname==='/rest/v1/book_processing_jobs'){
  assert.equal(url.searchParams.get('or'),'(visibility.eq.public)');assert.equal(url.searchParams.get('archived_at'),'is.null');assert.equal(url.searchParams.get('deletion_pending'),'eq.false');
  return json(available?[{id:'source',title:'Book title',author:'Writer',source_text:'First original line.\nSecond original line.'}]:[]);
 }
 throw Error('Unexpected service call '+url.pathname);
};
await import('../supabase/functions/reading-guides/index.ts');
const get=(suffix=`${id}.md`,method='GET')=>handler(new Request(`https://markdown-test.invalid/functions/v1/reading-guides/${suffix}`,{method}));
const result=await get();assert.equal(result.status,200);assert.match(result.headers.get('content-type'),/^text\/markdown/);const md=await result.text();
for(const text of ['# What is worth doing?','## Introduction','Book: Book title','Source text lines: 1–2','> First original line. Second original line.','## Bringing it together'])assert.ok(md.includes(text),text);
assert.ok(!md.includes('fixture-service'));assert.ok(!md.includes('source_text'));
assert.equal((await get(id+'.md','HEAD')).status,200);assert.equal(await (await get(id+'.md','HEAD')).text(),'');
visibility='private';assert.equal((await get()).status,404);visibility='public';status='composing';assert.equal((await get()).status,404);status='ready';available=false;assert.equal((await get()).status,503);
assert.equal((await get('not-an-id.md')).status,404);assert.equal((await get('00000000-0000-4000-8000-000000000002.md')).status,404);
console.log('PASS public Markdown GET/HEAD, selected originals and context, private/unready/missing rejection, unavailable sources fail closed.');
