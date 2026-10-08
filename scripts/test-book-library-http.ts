// Actual Edge handler, intercepted dependencies, no network permission or real data.
import assert from 'node:assert/strict';
const owner='00000000-0000-4000-8000-000000000001',revision='00000000-0000-4000-8000-000000000002',entry='00000000-0000-4000-8000-000000000003';
Deno.env.set('SUPABASE_URL','https://synthetic.example.invalid');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','synthetic-service');Deno.env.set('OPENAI_API_KEY','synthetic-provider');Deno.env.set('BOOK_QUEUE_RUNNER_SECRET','synthetic-runner');
let handler:any;Deno.serve=((h:any)=>{handler=h;return {} as any;}) as typeof Deno.serve;
const calls:any[]=[];let rateAllowed=true,claimCount=0;
const json=(value:unknown,status=200)=>Response.json(value,{status});
globalThis.fetch=async(input:any,init?:RequestInit)=>{
 const req=new Request(input,init),url=new URL(req.url),body=await req.clone().json().catch(()=>null);calls.push({url:url.pathname,body});
 if(url.hostname==='api.openai.com')return json({data:[{index:0,embedding:Array(512).fill(.01)}]});
 assert.equal(url.hostname,'synthetic.example.invalid');
 if(url.pathname==='/auth/v1/user')return req.headers.get('authorization')==='Bearer owner'?json({id:owner}):json({message:'Invalid'},401);
 if(url.pathname==='/rest/v1/book_cli_sessions')return json(null);
 if(url.pathname.includes('/rpc/')){
  const action=url.pathname.split('/').at(-1);
  if(action==='claim_book_library_entries'){claimCount++;return json([]);}
  if(action==='wake_book_library')return json(null);
  assert.equal(body.p_user,owner,'Never trust a caller-supplied user ID');
  if(action==='allow_book_library_search')return json(rateAllowed);
  if(action==='book_library_coverage')return json({sections:1,embedded:1,failed:0});
  if(action==='search_book_library')return json([{entry_id:entry,book_id:revision,revision_id:revision,title:'Source',section_id:'ch01',score:.03}]);
  if(action==='book_library_evidence')return json([{entry_id:entry,book_id:revision,revision_id:revision,title:'Source',author:'Editor',section_id:'ch01',citations:[{source:'S1',startLine:1,endLine:1,requestedEndLine:1,truncated:false,excerpt:'1: Exact source evidence.'}],note:{summary:'A method',sourceRefs:[{startLine:1,endLine:1}],ideas:[]}}]);
 }
 throw Error('Unexpected request '+url.pathname);
};
await import('../supabase/functions/book-library/index.ts');
const request=(body:unknown,token='owner',origin='https://answerwithbooks.com')=>handler(new Request('https://worker.invalid/book-library',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),Origin:origin},body:JSON.stringify(body)}));
assert.equal((await request({action:'search',question:'method'},'')).status,401);
assert.equal((await request({action:'search',question:'method'},'expired')).status,401);
assert.equal((await request({action:'search',question:'method'},'owner','https://bad.invalid')).status,403);
assert.equal((await request({action:'search',question:'x'.repeat(2001)})).status,400);
assert.equal((await request({action:'search',question:'x'.repeat(12001)})).status,413);
assert.equal((await request({action:'drain'})).status,403);assert.equal(claimCount,0);
const response=await request({action:'search',question:'method',user_id:'other-user'});assert.equal(response.status,200);const result=await response.json();
assert.equal(result.method,'hybrid');assert.equal(result.matches.length,1);assert.equal(result.matches[0].citations[0].excerpt,'1: Exact source evidence.');assert.ok(!JSON.stringify(result).includes('Private unused text'));assert.equal(response.headers.get('cache-control'),'no-store');
rateAllowed=false;const before=calls.filter(c=>c.url==='/v1/embeddings').length;assert.equal((await request({action:'search',question:'method'})).status,429);assert.equal(calls.filter(c=>c.url==='/v1/embeddings').length,before);
assert.equal((await request({action:'drain'},'synthetic-runner')).status,200);assert.equal(claimCount,1);
console.log('PASS actual library handler: authentication, origin, request bounds, verified account, rate limit, bounded exact evidence, runner-only indexing');
