import {bookReadingSections} from './private-book-reading.mjs';
import {bookJacketMarkup} from './book-jacket.mjs';
import {coverPalette} from '../../supabase/functions/_shared/book-cover-design.mjs';
import {bookStatus,bookSourceLabel} from './book-library-status.mjs';
import {supabase} from './supabase';
import {bookWorker,nativeBookWorker} from './book-upload';
import {bookAgentPrompt} from '../../supabase/functions/_shared/book-handoff.mjs';
const root=document.querySelector<HTMLElement>('[data-private-book]')!;
const find=<T extends HTMLElement>(name:string)=>root.querySelector<T>(`[data-job-${name}]`)!;
const id=new URL(location.href).searchParams.get('id');
if(id)find<HTMLAnchorElement>('billing').href='/billing/?book='+encodeURIComponent(id);
let identityEpoch=0;let current:any,running=false,renderedKey='',priceQuote:any=null;
const nativePending=(job:any)=>job?.source_import?.kind==='native'&&['queued','processing'].includes(job.source_import.state);
const needsPayment=(job:any)=>!job?.archived_at&&job?.billing_required&&job.status!=='ready'&&!['held','reconciliation','imported'].includes(job.billing?.state)&&(job.source_import?.state==='complete'||!job.source_import);
function appendMarkdown(box:HTMLElement,text:string) {
 const inline=(el:HTMLElement,text:string)=>{
  for(const part of text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)) {
   if(part.startsWith('**')&&part.endsWith('**')) {const strong=document.createElement('strong');strong.textContent=part.slice(2,-2);el.append(strong);}
   else if(part.startsWith('`')&&part.endsWith('`')) {const code=document.createElement('code');code.textContent=part.slice(1,-1);el.append(code);}
   else el.append(document.createTextNode(part));
  }
 };
 for(const raw of text.split(/\n\n+/)) {
  const block=raw.trim();if(!block)continue;
  const heading=block.match(/^(#{1,3}) (.+)$/);
  if(heading) {const el=document.createElement(`h${Math.max(2,heading[1].length)}`);el.textContent=heading[2];box.append(el);}
  else if(/^(1\. |[-*] )/.test(block)) {const list=document.createElement(/^1\./.test(block)?'ol':'ul');for(const line of block.split('\n')){const li=document.createElement('li');inline(li,line.replace(/^(\d+\. |[-*] )/,''));list.append(li);}box.append(list);}
  else {const el=document.createElement('p');el.className='whitespace-pre-wrap break-words';inline(el,block);box.append(el);}
 }
}

function renderReferenceNotes(markdown:string){
 const sections=bookReadingSections(markdown).filter((s:any)=>s.detailed),box=find('reference-notes');box.replaceChildren();find('lessons').hidden=!sections.length;
 for(const section of sections){const group=document.createElement('details'),label=document.createElement('summary');label.textContent=section.title;label.className='cursor-pointer py-3 font-serif text-xl';group.append(label);let rendered=false;group.addEventListener('toggle',()=>{if(!group.open||rendered)return;rendered=true;for(const block of section.text.split(/(?=^### )/m).filter(Boolean)){const entry=document.createElement('details'),heading=block.match(/^### ([^\n]+)\n/),title=document.createElement('summary');title.textContent=heading?.[1]||'Source notes';title.className='cursor-pointer py-3';entry.className='border-t border-line';entry.append(title);let loaded=false;entry.addEventListener('toggle',()=>{if(entry.open&&!loaded){loaded=true;const content=document.createElement('div');appendMarkdown(content,heading?block.slice(heading[0].length):block);entry.append(content);}});group.append(entry);}});box.append(group);}
}
function reader(job:any){try{return JSON.parse(job.artifacts?.['reader/digest.json']||'null');}catch{return null;}}
function preparePrompt(job:any){
 const digest=job.artifacts?.['reader/digest.md']||bookReadingSections(job.artifacts?.['book.md']).find((s:any)=>s.title==='Central argument')?.text||job.skill_summary?.one_liner||'';
 return bookAgentPrompt({title:job.title,author:job.author,url:`https://answerwithbooks.com/your-book/?id=${job.id}`,digest})+`\n\nIf Answer with Books is connected, retrieve the relevant methods and citations from private book ${job.book_id||job.id}. The complete skill is available through that library; no download is needed.`;
}
async function copyPrompt(){
 if(!current?.artifacts||current.archived_at)return;
 const prompt=root.querySelector<HTMLTextAreaElement>('[data-book-agent-prompt]')!,status=root.querySelector<HTMLElement>('[data-book-agent-status]')!;prompt.value=preparePrompt(current);
 try{await navigator.clipboard.writeText(prompt.value);status.textContent=find('copy-status').textContent='Copied. Paste into your AI chat and add your task.';}catch{prompt.hidden=false;prompt.focus();prompt.select();status.textContent=find('copy-status').textContent='Select and copy the prompt below.';}
}
async function paint(job:any){
 current=job;const complete=job.status==='ready'&&!!job.artifacts,hasArtifacts=!!job.artifacts;
 find('title').textContent=job.title;find('author').textContent=job.author==='Unknown author'?'Author not identified':job.author;
 find('archived').hidden=!job.archived_at;find('header-actions').hidden=!hasArtifacts;find('overview').hidden=!hasArtifacts;find('content').hidden=!hasArtifacts;
 find('management').hidden=complete||!!job.archived_at;find('generate').hidden=job.status!=='analyzed'||needsPayment(job);
 const sourceScope=bookSourceLabel(job);find('scope').hidden=!sourceScope.startsWith('Excerpt');find('scope').textContent=sourceScope.split(' · ').slice(0,2).join(' · ');
 const r=reader(job);find('read-if').textContent=r?.readIf||job.skill_summary?.read_if||'';find('one-liner').textContent=r?.oneLiner||job.skill_summary?.one_liner||'';
 find('status').textContent=bookStatus(job);find<HTMLProgressElement>('progress').value=complete?100:Math.round((job.cursor||0)/((job.total_sections||0)+3)*85);
 find('resume').hidden=complete;find('pause').hidden=job.run_state!=='queued'||nativePending(job);find('retry').hidden=job.status==='analyzed'||nativePending(job)||!['failed','paused','manual'].includes(job.run_state);find('cancel').hidden=job.billing?.state!=='held';find('cover-retry').hidden=true;find('usage-show').hidden=true;
 find('payment').hidden=!needsPayment(job);if(!needsPayment(job)){priceQuote=null;find('pay').hidden=true;}else{find('retry').hidden=true;find('resume').hidden=true;find('status').textContent='Source saved. Review a spending limit to start hosted conversion.';}
 if(job.billing?.state==='reconciliation'){find('status').textContent='Usage is being reconciled. No further paid work will start until receipts are confirmed.';find('retry').hidden=true;}
 const previous=find('last-error');previous.hidden=!job.error;previous.textContent=job.error||'';
 const existing=find<HTMLAnchorElement>('existing-book');existing.hidden=!job.existing_book;if(job.existing_book){existing.href=`/your-book/?id=${encodeURIComponent(job.existing_book.id)}`;existing.textContent='Open your completed book';find('payment').hidden=true;}
 const key=JSON.stringify([job.id,job.updated_at,job.archived_at,job.artifacts?.['reader/digest.md']]);
 if(hasArtifacts&&renderedKey!==key){
  renderedKey=key;const digest=job.artifacts['reader/digest.md'];find('reading').replaceChildren();appendMarkdown(find('reading'),digest||'## Summary not yet available\n\nThis earlier conversion contains source notes and an agent skill. Its separate editorial summary has not been created yet.');
  const words=(digest||'').trim().split(/\s+/).filter(Boolean).length;find('digest-meta').textContent=digest?`Private book digest · ${words.toLocaleString()} words · ${Math.max(1,Math.ceil(words/200))} min`:'Private book';
  renderReferenceNotes(job.artifacts['book.md']||'');find('skill-thesis').textContent=bookReadingSections(job.artifacts['book.md']||'').find((s:any)=>s.title==='Central argument')?.text||job.skill_summary?.one_liner||'';
  find('skill-example').textContent=`Ask: “Use ${job.title} to help me with…”`;
  const notice=find('reader-notice');notice.hidden=r?.review?.status!=='customer-agent';notice.textContent='This digest was created with your agent. Check important claims against the source.';
  find('purchase-title').textContent=job.title;find('purchase-author').textContent=`by ${job.author}`;find<HTMLAnchorElement>('amazon').href='https://www.amazon.com/s?k='+encodeURIComponent(`${job.title} ${job.author}`);
  document.querySelector<HTMLElement>('[data-private-faq]')!.hidden=false;const questions=document.querySelectorAll<HTMLElement>('[data-private-faq] h3');questions[0].textContent=`What is ${job.title} useful for?`;questions[0].closest('details')!.querySelector('p')!.textContent=r?.readIf||job.skill_summary?.read_if||'Use the ideas in this book to examine your question, within its source scope.';
  for(const button of [find<HTMLButtonElement>('copy'),root.querySelector<HTMLButtonElement>('[data-copy-book-agent]')!])button.disabled=!!job.archived_at;
 }
 if(job.cover_path&&find('cover').dataset.path!==job.cover_path){const {data}=await supabase.storage.from('private-books').createSignedUrl(job.cover_path,3600);if(data){const cover=find('cover');cover.innerHTML=bookJacketMarkup({title:job.title,author:job.author||'',color:coverPalette(job).bg,coverAsset:data.signedUrl,loading:'eager'});cover.dataset.path=job.cover_path;cover.setAttribute('aria-label',`${job.title} cover`);cover.hidden=false;}}
}
async function run(action?:string){
 if(running)return;running=true;const epoch=identityEpoch;
 try{if(!id)throw Error('Choose a book from your library first.');const {data}=await supabase.auth.getSession();if(!data.session)throw Error('Sign in to read your private book.');if(action==='retry'&&current?.source_import?.kind==='native'&&current.source_import.state==='failed'){await nativeBookWorker({action:'retry',id});action='status';}const result=await bookWorker({action:action||'status',id});if(epoch===identityEpoch)await paint(result.job);}
 catch(e){find('management').hidden=false;find('status').textContent=e instanceof Error?e.message:'Could not load your book.';}finally{running=false;}
}
find('copy').addEventListener('click',()=>void copyPrompt());root.querySelector('[data-copy-book-agent]')!.addEventListener('click',()=>void copyPrompt());
find('generate').addEventListener('click',()=>void run('generate'));
find('pause').addEventListener('click',()=>void run('pause'));find('retry').addEventListener('click',()=>void run('retry'));
find('quote').addEventListener('click',async()=>{const button=find<HTMLButtonElement>('quote');button.disabled=true;find('pay').hidden=true;priceQuote=null;try{const ceilingCents=Math.round(Number(find<HTMLInputElement>('limit').value)*100);if(!Number.isSafeInteger(ceilingCents)||ceilingCents<1)throw Error('Enter a positive spending limit.');const result=await bookWorker({action:'quote',id,ceilingCents});priceQuote=result.billing;if(priceQuote.state!=='quoted')return void run();if(priceQuote.pricingModel!=='token-usage-v1')throw Error('Usage-based pricing is not available on this server yet. No work was started.');const amount=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(priceQuote.priceCents/100);find('price-message').textContent=`Reserve up to ${amount}. Actual generation usage is charged at the rates below, including reviews and repairs, even on failure. Unused funds are released. This is a limit, not an estimate of completion cost. Authorization expires ${new Date(priceQuote.expiresAt).toLocaleString()}. `+(priceQuote.modelRates||[]).map((r:any)=>`${r.model}: customer rates per million tokens — input $${Number(r.inputUsdPerMillion)}, cached $${Number(r.cachedInputUsdPerMillion)}, output $${Number(r.outputUsdPerMillion)}.`).join(' ');find('pay').textContent=`Authorize up to ${amount} & start`;find('pay').hidden=false;}catch(error){find('price-message').textContent=error instanceof Error?error.message:'Price unavailable. Your source is saved.';}finally{button.disabled=false;}});
find('pay').addEventListener('click',async()=>{if(!priceQuote||priceQuote.state!=='quoted')return;const button=find<HTMLButtonElement>('pay');button.disabled=true;try{await bookWorker({action:'accept-price',id,quoteId:priceQuote.quoteId,acceptedCeilingCents:priceQuote.ceilingCents,pricingModel:'token-usage-v1'});priceQuote=null;await run();}catch(error){find('price-message').textContent=error instanceof Error?error.message:'Could not start. Check your balance.';}finally{button.disabled=false;}});

find('cancel').addEventListener('click',()=>void run('cancel'));


void run();setInterval(()=>{if(!document.hidden&&(current?.run_state==='queued'||nativePending(current)))void run();},5000);
window.addEventListener('focus',()=>void run());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void run();});

supabase.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){identityEpoch++;current=null;renderedKey='';for(const key of ['content','overview','header-actions','cover'])find(key).hidden=true;find('reading').replaceChildren();find('title').textContent='Your private book';find('author').textContent='';find('management').hidden=false;find('status').textContent='Sign in to read your private book.';document.querySelector<HTMLElement>('[data-private-faq]')!.hidden=true;}});
