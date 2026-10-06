// Opt-in storage/worker acceptance. Uses a temporary account and no generation calls.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
if(process.env.AWB_LIVE_UPLOAD_TEST!=='1')throw new Error('Set AWB_LIVE_UPLOAD_TEST=1 to create and clean up a temporary acceptance account.');
process.loadEnvFile('.env');
const limits=JSON.parse(await readFile(new URL('../supabase/functions/_shared/book-upload-limits.json',import.meta.url)));
// Capture the operator credential only in memory; never print it or persist it.
const serviceKey=execFileSync('python3',['-c',`import importlib.util,json,urllib.request
spec=importlib.util.spec_from_file_location('setup','scripts/sync-auth-email-templates.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
req=urllib.request.Request('https://api.supabase.com/v1/projects/'+mod.PROJECT+'/api-keys',headers={'Authorization':'Bearer '+mod.access_token()})
with urllib.request.urlopen(req,timeout=30) as response: keys=json.load(response)
print(next(key['api_key'] for key in keys if key['name']=='service_role'))
`],{encoding:'utf8'}).trim();
const url=process.env.PUBLIC_SUPABASE_URL,publicKey=process.env.PUBLIC_SUPABASE_ANON_KEY;
assert.equal(new URL(url).hostname,'yozeqanibszoxnowmvsm.supabase.co');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(url,serviceKey,options),client=createClient(url,publicKey,options),anonymous=createClient(url,publicKey,options);
let userId,jobId;
const receipt={fileBytes:limits.maxFileBytes,generationCalls:0,emailsSent:0};
try {
 const email=`upload-capacity-${randomUUID()}@example.invalid`,password=randomUUID()+randomUUID();
 const account=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:'Upload capacity test'}});
 assert.equal(account.error,null,'Create temporary acceptance account');userId=account.data.user.id;
 assert.equal((await client.auth.signInWithPassword({email,password})).error,null,'Authenticate temporary account');
 const health=await client.functions.invoke('book-process',{body:{action:'health'}});
 assert.equal(health.data.max_file_bytes,limits.maxFileBytes);assert.equal(health.data.max_text_characters,limits.maxTextCharacters);
 // Exact-boundary bytes exercise storage and the worker hash check. Parser coverage
 // uses real searchable PDF/EPUB/DOCX fixtures in the separate source-upload tests.
 const bytes=Buffer.alloc(limits.maxFileBytes,65),sha=createHash('sha256').update(bytes).digest('hex');
 const source={action:'create',name:'capacity-fixture.txt',size:bytes.length,sha,text:'Chapter 1: Capacity acceptance\nThis original test fixture checks private storage capacity and source integrity. No book, skill, or cover generation is requested.'};
 const oversized=await client.functions.invoke('book-process',{body:{...source,size:limits.maxFileBytes+1}});
 assert.ok(oversized.error);assert.equal(oversized.error.context.status,400);receipt.oversizedMetadataRejected=true;
 const created=await client.functions.invoke('book-process',{body:source});assert.equal(created.error,null,'Create capacity job');jobId=created.data.job.id;
 const upload=created.data.upload;assert.ok(upload);
 const saved=await client.storage.from('private-books').uploadToSignedUrl(upload.path,upload.token,bytes,{contentType:'application/octet-stream'});
 assert.equal(saved.error,null,'Store exact 50 MB source');receipt.fullSizeStored=true;
 const privateRead=await anonymous.storage.from('private-books').download(upload.path);assert.ok(privateRead.error);receipt.anonymousReadBlocked=true;
 const checked=await client.functions.invoke('book-process',{body:{action:'process',id:jobId}});
 assert.equal(checked.error,null,'Worker downloads and validates full-size source hash');
 assert.equal(checked.data.job.status,'processing');assert.equal(checked.data.job.cursor,0);receipt.workerHashVerified=true;
} finally {
 if(jobId){const removed=await client.functions.invoke('book-process',{body:{action:'delete',id:jobId}});assert.equal(removed.error,null,'Clean up test source and job');}
 if(userId){const removed=await admin.auth.admin.deleteUser(userId);assert.equal(removed.error,null,'Clean up temporary account');}
 receipt.cleanupComplete=true;
}
receipt.checkedAt=new Date().toISOString();
if(process.env.AWB_UPLOAD_RECEIPT)await writeFile(process.env.AWB_UPLOAD_RECEIPT,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
