// Controller tests with an in-memory DOM and fake API. No real keys or network calls.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import test from 'node:test';
import { buildAgentConnectionPrompt, describeAccountBilling } from '../src/lib/account-connection.mjs';

const code = transformSync(readFileSync('src/lib/tool-account-access.ts','utf8').replace(/^import .*;\n/gm,''), {
  loader:'ts',format:'cjs',define:{'import.meta.env.PUBLIC_CAPABILITY_API_URL':'"https://api.example.com"'},
}).code;
const tick = () => new Promise(resolve=>setImmediate(resolve));
const key = {id:'00000000-0000-4000-8000-000000000001',label:'Test agent',prefix:'awb_live_fixture',createdAt:'2026-09-13T00:00:00Z',revokedAt:null};
const fixtureSecret = `awb_live_${'a'.repeat(43)}`;
function fixture(overrides={}, standalone=false) {
  const elements=[], nodes=new Map(), calls=[], focus=[], copied=[];
  class Element {
    constructor(tag='div'){this.tag=tag;this.hidden=false;this.open=false;this.disabled=false;this.value='';this.type='';this.textContent='';this.children=[];this.events={};this.isConnected=true;elements.push(this);}
    addEventListener(name,fn){(this.events[name]??=[]).push(fn);}
    async emit(name){const e={currentTarget:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};await Promise.all((this.events[name]||[]).map(fn=>fn(e)));return e;}
    async click(){if(!this.disabled)return this.emit('click');}
    append(...children){this.children.push(...children);}
    replaceChildren(){this.children=[];}
    setAttribute(name,value){this[name]=value;}
    showModal(){this.open=true;}
    close(){this.open=false;void this.emit('close');}
    focus(){focus.push(this);}
    select(){}
    querySelector(selector){if(selector==='[type=submit]')return submit;return nodes.get(selector);}
    querySelectorAll(selector){if(selector==='button')return elements.filter(e=>e.tag==='button');if(selector==='[data-key-close]')return closeButtons;if(selector==='[data-revoke-close]')return revokeClose;return [];}
    reset(){nodes.get('#api-key-label').value='';}
    reportValidity(){return /\S/.test(nodes.get('#api-key-label').value);}
  }
  const root=new Element();
  for(const selector of ['data-access-status','data-access-create','data-access-keys','data-key-open','data-key-dialog','data-key-revoke-dialog','data-key-create-error','data-access-secret','data-key-secret','data-key-status','data-access-table','data-access-empty','data-access-count','data-key-reveal','data-key-copy','data-key-dialog-title','data-key-dialog-description','data-revoke-name','data-revoke-error','data-revoke-confirm','data-access-refresh','data-key-download','data-key-check']) nodes.set(`[${selector}]`,new Element(/open|reveal|copy|confirm|refresh|download|check/.test(selector)?'button':'div'));
  nodes.set('.key-options',new Element('details'));nodes.set('#api-key-label',new Element('input'));
  for (const selector of ['data-api-address','data-connection-copy-status','data-connection-manual','data-api-connection','data-copy-api-address','data-copy-agent-connection','data-key-billing-title','data-key-billing-description']) nodes.set(`[${selector}]`,new Element(selector.startsWith('data-copy-')?'button':'div'));
  if(standalone) for(const selector of ['data-api-address','data-connection-copy-status','data-connection-manual','data-api-connection','data-copy-api-address','data-copy-agent-connection']) nodes.delete(`[${selector}]`);
  const submit=new Element('button'),closeButtons=[new Element('button')],revokeClose=[new Element('button')];
  nodes.get('[data-key-secret]').type='password';
  const client={billing:async()=>({mode:'metering-only'}),list:async()=>({access:'approved',keys:[]}),create:async(id,label)=>{calls.push(['create',id,label]);return {key:{...key,label},secret:fixtureSecret};},revoke:async(id,keyId)=>calls.push(['revoke',id,keyId]),...overrides};
  const module={exports:{}};
  runInNewContext(code,{module,exports:module.exports,Error,Date,Number,URL,Blob,buildAgentConnectionPrompt,describeAccountBilling,copyText:async value=>copied.push(value),location:{origin:'http://127.0.0.1:4321'},resolveResearchOrigin:()=> 'https://api.example.com',createToolAccessClient:()=>client,supabase:{},document:{createElement:tag=>new Element(tag),execCommand:()=>true},window:{addEventListener(){},setTimeout},navigator:{clipboard:{writeText:async()=>{}}},FormData:class{get(){return nodes.get('#api-key-label').value;}}});
  const access=module.exports.setupToolAccountAccess(root);
  return {access,nodes,calls,elements,closeButtons,revokeClose,focus,submit,copied};
}
test('named create modal opens without a request; copy-once result clears when closed',async()=>{
  const f=fixture();f.access.setIdentity('user');await tick();
  await f.nodes.get('[data-key-open]').click();
  assert.equal(f.calls.length,0);assert.equal(f.nodes.get('[data-key-dialog]').open,true);
  await f.nodes.get('[data-access-create]').emit('submit');assert.equal(f.calls.length,0,'Blank name cannot create a key');
  f.nodes.get('#api-key-label').value='Codex on Mac';await f.nodes.get('[data-access-create]').emit('submit');
  assert.deepEqual(f.calls,[['create','user','Codex on Mac']]);
  assert.equal(f.nodes.get('[data-access-create]').hidden,true);
  assert.equal(f.nodes.get('[data-key-secret]').value,fixtureSecret);
  assert.equal(f.nodes.get('[data-key-secret]').type,'password');
  await f.nodes.get('[data-key-copy]').click();assert.equal(f.nodes.get('[data-key-copy]').textContent,'Copied');
  assert.equal(f.copied[0],fixtureSecret);
  await f.closeButtons[0].click();assert.equal(f.nodes.get('[data-key-secret]').value,'');assert.equal(f.nodes.get('[data-access-secret]').hidden,true);
});
test('connection copy uses configured API, excludes credentials, and shows the same account billing mode',async()=>{
  const f=fixture();f.access.setIdentity('user');await tick();
  assert.equal(f.nodes.get('[data-key-billing-title]').textContent,'Private preview · Usage only');
  await f.nodes.get('[data-copy-api-address]').click();assert.equal(f.copied[0],'https://api.example.com');
  await f.nodes.get('[data-copy-agent-connection]').click();
  assert.match(f.copied[1],/https:\/\/api.example.com/);assert.match(f.copied[1],/POST \/v1\/run/);assert.match(f.copied[1],/Idempotency-Key/);assert.ok(!f.copied[1].includes(fixtureSecret));
  let resolve;const g=fixture({billing:()=>new Promise(done=>resolve=done)});g.access.setIdentity('user');await tick();g.access.setIdentity(null);resolve({mode:'live',availableCents:1500});await tick();
  assert.equal(g.nodes.get('[data-key-billing-title]').textContent,'Billing & task history','a former account balance is not rendered after signout');
});
test('revocation requires a separate explicit confirmation',async()=>{
  const f=fixture({list:async()=>({access:'approved',keys:[{...key}]})});f.access.setIdentity('user');await tick();
  const revoke=f.elements.find(e=>e.className==='key-revoke');await revoke.click();
  assert.equal(f.calls.length,0);assert.equal(f.nodes.get('[data-key-revoke-dialog]').open,true);
  await f.revokeClose[0].click();assert.equal(f.calls.length,0);
  await revoke.click();await f.nodes.get('[data-revoke-confirm]').click();
  assert.deepEqual(f.calls,[['revoke','user',key.id]]);assert.equal(f.nodes.get('[data-key-revoke-dialog]').open,false);
  assert.equal(f.nodes.get('[data-access-keys]').children.length,0);
  assert.equal(f.nodes.get('[data-access-empty]').hidden,false);
  assert.equal(f.nodes.get('[data-key-open]').disabled,false);
  assert.match(f.nodes.get('[data-access-status]').textContent,/revoked and removed/i);
});
test('revoked keys disappear, including responses from older servers',async()=>{
  const revoked={...key,revokedAt:'2026-09-13T01:00:00Z'};
  const f=fixture({list:async()=>({access:'approved',keys:[revoked]})});f.access.setIdentity('user');await tick();
  assert.equal(f.nodes.get('[data-access-table]').hidden,true);
  assert.equal(f.nodes.get('[data-key-open]').disabled,false);
  assert.match(f.nodes.get('[data-access-count]').textContent,/0 active keys/);
  assert.equal(f.nodes.get('[data-access-keys]').children.length,0);
  f.access.setIdentity(null);
  assert.equal(f.nodes.get('[data-access-keys]').children.length,0);
});
test('a failed revocation keeps the key active and reports the failure',async()=>{
  const f=fixture({list:async()=>({access:'approved',keys:[{...key}]}),revoke:async()=>{throw new Error('Connection interrupted');}});f.access.setIdentity('user');await tick();
  await f.elements.find(e=>e.className==='key-revoke').click();
  await f.nodes.get('[data-revoke-confirm]').click();
  assert.equal(f.nodes.get('[data-key-revoke-dialog]').open,true);
  assert.equal(f.nodes.get('[data-revoke-error]').textContent,'Connection interrupted');
  assert.equal(f.nodes.get('[data-access-keys]').children.length,1);
  assert.match(f.nodes.get('[data-access-count]').textContent,/1 active key/);
});
test('pending access prevents creation but there is no active-key count limit',async()=>{
  for(const result of [{access:'pending',keys:[]},{access:'approved',keys:Array.from({length:35},(_,i)=>({...key,id:`fixture-${i}`}))}]){
    const f=fixture({list:async()=>result});f.access.setIdentity('user');await tick();
    assert.equal(f.nodes.get('[data-key-open]').disabled,result.access==='pending');
    await f.nodes.get('[data-key-open]').click();assert.equal(f.nodes.get('[data-key-dialog]').open,result.access==='approved');
  }
});
test('standalone keys page works without connection controls and still links billing',async()=>{
  const f=fixture({},true);f.access.setIdentity('user');await tick();
  assert.equal(f.nodes.get('[data-key-open]').disabled,false);
  assert.equal(f.nodes.get('[data-key-billing-title]').textContent,'Private preview · Usage only');
  await f.nodes.get('[data-key-open]').click();
  assert.equal(f.nodes.get('[data-key-dialog]').open,true);
  f.access.setIdentity(null);assert.equal(f.nodes.get('[data-key-dialog]').open,false);
  const source=readFileSync('src/components/ToolAccountAccess.astro','utf8');
  assert.match(source,/!standalone && <div class="connection-card"/);
  assert.doesNotMatch(source,/Revoked history|three-key limit|key-filters|key-limit-note/);
});
test('failed creation is not retried and a stale response cannot expose a key after sign-out',async()=>{
  let attempts=0;
  const f=fixture({create:async()=>{attempts++;throw new Error('Connection interrupted');}});f.access.setIdentity('user');await tick();
  await f.nodes.get('[data-key-open]').click();f.nodes.get('#api-key-label').value='Test';await f.nodes.get('[data-access-create]').emit('submit');
  assert.equal(attempts,1);assert.match(f.nodes.get('[data-key-create-error]').textContent,/refresh your keys/);
  let resolve;
  const g=fixture({create:()=>new Promise(done=>resolve=done)});g.access.setIdentity('user');await tick();
  await g.nodes.get('[data-key-open]').click();g.nodes.get('#api-key-label').value='Test';const request=g.nodes.get('[data-access-create]').emit('submit');
  assert.equal((await g.nodes.get('[data-key-dialog]').emit('cancel')).defaultPrevented,true);
  g.access.setIdentity(null);resolve({key,secret:fixtureSecret});await request;
  assert.equal(g.nodes.get('[data-key-secret]').value,'');assert.equal(g.nodes.get('[data-key-dialog]').open,false);
});
