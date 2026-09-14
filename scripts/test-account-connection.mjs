import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describeAccountBilling, buildAgentConnectionPrompt } from '../src/lib/account-connection.mjs';
import { formatRunResult } from '../src/lib/run-result.mjs';

test('billing summary distinguishes money, sandbox, payment review, and unknown state',()=>{
  assert.match(describeAccountBilling({mode:'metering-only'}).detail,/payments are not enabled/);
  assert.match(describeAccountBilling({mode:'test',availableCents:2500}).title,/\$25.00 test balance/);
  assert.equal(describeAccountBilling({mode:'live',availableCents:2500}).title,'$25.00 available');
  assert.equal(describeAccountBilling({mode:'live',paymentReview:true}).title,'Billing under review');
  assert.throws(()=>describeAccountBilling({mode:'unexpected'}));
  assert.throws(()=>describeAccountBilling({mode:'live'}));
  assert.throws(()=>buildAgentConnectionPrompt('https://user:password@api.example.com','https://answerwithbooks.com'));
});
test('copyable results keep lead evidence, limitations, sources, and the task identifier',()=>{
  const output=formatRunResult({id:'task-123',result:{answer:{title:'Leads',summary:'Research summary',findings:[{title:'Fit',detail:'Observed evidence',evidence:['https://example.com/source']}],leads:[{name:'Team',url:'https://github.com/example',reason:'Potential fit',evidence:['https://example.com/source']}],limitations:['Not buying intent']},sources:[{title:'Source',url:'https://example.com/source'}]}});
  for(const text of ['Research summary','Observed evidence','https://github.com/example','Potential fit','Not buying intent','https://example.com/source','task-123']) assert.ok(output.includes(text));
  assert.equal(formatRunResult({result:null}),'');
});
test('clipboard API and fallback copy exact text, clear temporary fields, and report failures',async()=>{
  const code=readFileSync('src/lib/copy-text.mjs','utf8').replace('export async function','async function')+'\nthis.copyText=copyText;';
  const copies=[];let removed=false,focused=false,field;
  const context={navigator:{clipboard:{writeText:async value=>copies.push(value)}},document:{activeElement:{isConnected:true,focus(){focused=true;}},createElement(){return field={value:'',style:{},setAttribute(){},focus(){},select(){},remove(){removed=true;}};},execCommand(){copies.push(field.value);return true;}}};
  runInNewContext(code,context);const container={append(){}};
  await context.copyText('exact clipboard text',container);assert.equal(copies[0],'exact clipboard text');
  context.navigator.clipboard.writeText=async()=>{throw new Error('permission denied');};
  await context.copyText('fallback text',container);assert.equal(copies[1],'fallback text');assert.ok(removed&&focused);assert.equal(field.value,'');
  context.document.execCommand=()=>false;await assert.rejects(context.copyText('blocked text',container),/blocked/);assert.equal(field.value,'');
});
