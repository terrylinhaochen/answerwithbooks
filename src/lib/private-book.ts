import {bookReadingSections,readingOverviewWords} from './private-book-reading.mjs';
import {bookJacketMarkup} from './book-jacket.mjs';
import {coverPalette} from '../../supabase/functions/_shared/book-cover-design.mjs';
import {bookStatus,bookSourceLabel} from './book-library-status.mjs';
import {auditUpstream} from './upstream-book';
import {zipSync,strToU8} from 'fflate';
import {supabase} from './supabase';
import {bookWorker,nativeBookWorker,openBookUpload} from './book-upload';
import {bookAgentPrompt} from '../../supabase/functions/_shared/book-handoff.mjs';
import {sourceReviewNotice,previousReviewPath} from '../../supabase/functions/_shared/book-review-status.mjs';
import bookCliRelease from './book-cli-release.json';
const root=document.querySelector<HTMLElement>('[data-private-book]')!;
const find=<T extends HTMLElement>(name:string)=>root.querySelector<T>(`[data-job-${name}]`)!;
const id=new URL(location.href).searchParams.get('id');
if(id)find<HTMLAnchorElement>('billing').href='/billing/?book='+encodeURIComponent(id);
let priceQuote:any=null;
const needsPayment=(job:any)=>job?.billing_required&&(!job.artifacts||job.status==='ready'&&job.cover_status==='failed'&&!job.cover_path)&&!['held','reconciliation'].includes(job.billing?.state)&&(job.source_import?.state==='complete'||!job.source_import);
let current:any, running=false, rendered=false, analysisRendered=false, auditPassed=false, hasFindings=false, activating=false;
let revisionsKey='',revisionCanActivate=false,skillLinkOpened=false,managementState='';
const nativePending=(job:any)=>job?.source_import?.kind==='native'&&['queued','processing'].includes(job.source_import.state);
function updateActivationGate(){find<HTMLButtonElement>('activate').disabled=activating||current?.status!=='ready'||!revisionCanActivate||!find<HTMLInputElement>('activate-review').checked||!auditPassed||(hasFindings&&!find<HTMLInputElement>('review-accept').checked);}
function updateReviewGate(){const blocked=!auditPassed||(hasFindings&&!find<HTMLInputElement>('review-accept').checked);find<HTMLButtonElement>('copy').disabled=blocked;find<HTMLButtonElement>('download').disabled=blocked;updateActivationGate();}
async function checkSkill(files:Record<string,string>) {
 find<HTMLButtonElement>('copy').disabled=true;find<HTMLButtonElement>('download').disabled=true;find('audit-retry').hidden=true;
 find('audit').textContent='Checking skill format and content…';
 try {
  const report=await auditUpstream(files);
  find('audit').textContent=report.errors.length?'Skill needs repair: '+report.errors.join('; '):report.findings.length?`Skill structure passed. Review ${report.findings.length} flagged passage(s) before agent use: `+report.findings.slice(0,5).map(f=>`${f.path}:${f.line} (${f.rule_id})`).join('; '):'Skill structure checked. No advisory scan findings. This does not verify factual accuracy.';
  auditPassed=report.errors.length===0;hasFindings=report.findings.length>0;
  find('review').hidden=!hasFindings;
  find<HTMLInputElement>('review-accept').checked=false;
  find('findings').textContent=report.findings.map(f=>`${f.path}:${f.line} · ${f.rule_id}\n${files['skill/'+f.path]?.split('\n')[f.line-1]||''}`).join('\n\n');
  updateReviewGate();
  if(!auditPassed||hasFindings)find('copy-status').textContent='Open Use with AI below to review the skill check before copying or downloading.';
 } catch {find('audit').textContent='The skill check could not finish. Retry before exporting.';find('audit-retry').hidden=false;find('copy-status').textContent='Open Use with AI below to retry the skill check before copying or downloading.';}
}

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
function renderMarkdown(text:string) {
 const box=find('reading');box.replaceChildren();const sections=bookReadingSections(text);
 for(const section of sections) {
  if(!section.detailed){appendMarkdown(box,(section.title?`## ${section.title}\n\n`:'')+section.text);continue;}
  const chunks=section.text.split(/(?=^### )/m).filter(Boolean);
  const details=document.createElement('details'),summary=document.createElement('summary');
  details.className='my-6 rounded-xl border border-line p-5';details.dataset.readerNotes='';
  summary.className='cursor-pointer font-serif text-xl';summary.textContent=`${section.title} · ${chunks.length} ${section.title==='Core lessons'?'source sections':'frameworks'}`;
  details.append(summary);let expanded=false;
  details.addEventListener('toggle',()=>{
   if(!details.open||expanded)return;expanded=true;
   for(const chunk of chunks){
    const entry=document.createElement('details'),label=document.createElement('summary');
    const heading=chunk.match(/^### ([^\n]+)\n/);label.textContent=heading?.[1]||'Notes';label.className='cursor-pointer py-3 font-medium';
    entry.className='mt-3 border-t border-line';entry.append(label);let loaded=false;
    entry.addEventListener('toggle',()=>{if(entry.open&&!loaded){loaded=true;const body=document.createElement('div');appendMarkdown(body,heading?chunk.slice(heading[0].length):chunk);entry.append(body);}});
    details.append(entry);
   }
  });
  box.append(details);
 }
 const words=readingOverviewWords(sections);find('digest-meta').textContent=`Private book digest · ${Math.max(1,Math.ceil(words/200))} min overview`;
}
async function showVersions(job:any) {
 find('versions').hidden=false;
 const pending=job.is_current===false;
 if(!pending)revisionCanActivate=false;
 find('version-status').textContent=`Version ${job.revision||1} · ${pending?'Checking version history…':'Current book and skill'}`;
 find('revision-actions').hidden=job.status!=='ready'||pending;
 find('activation').hidden=!revisionCanActivate||job.status!=='ready';
 find('discard').hidden=!revisionCanActivate||!['complete','failed','paused'].includes(job.run_state);
 find<HTMLButtonElement>('discard').disabled=!!job.lease_until&&Date.parse(job.lease_until)>Date.now();
 find('version-message').textContent=pending?'Your current version stays available until you make this version current.':'Add or replace one source at a time. Each change stays in this book and skill.';
 updateActivationGate();
 const installId=job.book_id||job.id;
 const canInstall=job.status==='ready'&&!pending&&/^[a-zA-Z0-9-]+$/.test(installId);
 find('install').hidden=!canInstall;find('remote').hidden=!canInstall;
 if(canInstall)find('remote-example').textContent=`Ask: “Use ${job.title} to help me with…”`;
 if(canInstall)find('install-command').textContent=`npx --yes ${bookCliRelease.package || `answer-with-books@${bookCliRelease.version}`} library install-book ${installId}`;
 const key=`${job.id}:${job.status}:${job.is_current}:${job.revision}`;
 if(key===revisionsKey){if(pending)find('version-status').textContent=`Version ${job.revision||1} · ${revisionCanActivate?job.status==='ready'?'Review before making current':'New version in progress':'Previous version'}`;return;}
 revisionsKey=key;
 find('sources').replaceChildren();
 for(const source of job.source_manifest||[]) {
  const li=document.createElement('li');
  li.textContent=`${source.name}${source.startLine?` · source lines ${source.startLine}–${source.endLine}`:''}`;
  find('sources').append(li);
 }
 try {
  const result=await bookWorker({action:'revisions',id:job.id});
  const active=result.revisions?.find((revision:any)=>revision.is_current);
  revisionCanActivate=job.is_current===false&&!!job.parent_job_id&&job.parent_job_id===active?.id;
  find('discard').hidden=!revisionCanActivate||!['complete','failed','paused'].includes(job.run_state);
  if(pending){
   find('version-status').textContent=`Version ${job.revision||1} · ${revisionCanActivate?job.status==='ready'?'Review before making current':'New version in progress':'Previous version'}`;
   find('version-message').textContent=revisionCanActivate?'Your current version stays available until you make this version current.':'This saved version remains available. Open the current version to add or replace sources.';
  }
  find('activation').hidden=!revisionCanActivate||job.status!=='ready';updateActivationGate();
  find('revisions').replaceChildren();
  for(const revision of result.revisions||[]) {
   const li=document.createElement('li'),link=document.createElement('a');
   link.href=`/your-book/?id=${encodeURIComponent(revision.id)}`;link.className='underline underline-offset-4';
   const state=revision.is_current?'current':revision.status==='ready'?revision.revision>(active?.revision||0)?'ready to review':'previous version':revision.status;
   link.textContent=`Version ${revision.revision||1} · ${state}${revision.revision_kind==='append'?' · source added':revision.revision_kind==='replace'?' · source replaced':''}`;
   if(revision.id===job.id)link.setAttribute('aria-current','page');
   li.append(link);find('revisions').append(li);
  }
 }catch {revisionsKey='';revisionCanActivate=false;find('activation').hidden=true;find('discard').hidden=true;updateActivationGate();find('version-message').textContent='Version history is unavailable right now. Your saved book remains available.';}
}
async function paint(job:any) {
 current=job;
 const complete=job.status==='ready'&&!!job.artifacts;
 const attention=!complete||job.cover_status==='failed'||job.billing?.state==='reconciliation'||job.is_current===false;
 const managementKey=attention?'attention':'complete';
 if(managementState!==managementKey){find<HTMLDetailsElement>('management').open=attention;managementState=managementKey;}
 find('header-actions').hidden=!complete;
 find('overview').hidden=!complete;
 find('read-if').textContent=job.skill_summary?.read_if||'Use this book’s source-grounded ideas to explore your question.';
 find('one-liner').textContent=job.skill_summary?.one_liner||'Read the central argument, core lessons, and frameworks below.';
 find('cancel').hidden=job.billing?.state!=='held'||job.status==='ready';find('payment').hidden=!needsPayment(job);if(!needsPayment(job)){priceQuote=null;find('pay').hidden=true;}find('cover-retry').hidden=job.cover_status!=='failed'||job.billing_required&&job.billing?.state!=='held';find('usage-show').hidden=!job.cursor&&!job.artifacts;find('title').textContent=job.title;find('author').textContent=job.author==='Unknown author'?'Author not identified':job.author;
 find('source-scope').textContent=`${bookSourceLabel(job)} · ${job.source_name}`;
 const previous=find('last-error');previous.hidden=!job.last_error;previous.textContent=job.last_error?`Previous interruption${job.last_error_at?` (${new Date(job.last_error_at).toLocaleString()})`:''}: ${job.last_error}`:'';
 const existing=find<HTMLAnchorElement>('existing-book');existing.hidden=!job.existing_book;
 if(job.existing_book){existing.href=`/your-book/?id=${encodeURIComponent(job.existing_book.id)}`;existing.textContent='Open the completed book and skill for this source';}
 void showVersions(job);
 if(nativePending(job))find('progress').removeAttribute('value');
 else find<HTMLProgressElement>('progress').value=job.status==='ready'?100:job.artifacts?90:Math.round((job.cursor||0)/((job.total_sections||0)+2)*85);
 find('pause').hidden=job.run_state!=='queued'||nativePending(job);find('retry').hidden=nativePending(job)||(!['failed','paused','manual'].includes(job.run_state)&&job.source_import?.state!=='failed');
 find('status').textContent=bookStatus(job);
 if(needsPayment(job)){find('status').textContent=job.status==='ready'?'Your book and skill are ready. Approve a new spending limit only if you want to retry the cover.':'Source saved. Review a spending limit to start hosted conversion.';find('retry').hidden=true;find('resume').hidden=true;}
 if(job.billing?.state==='reconciliation'){find('status').textContent='Usage needs reconciliation. Your reserved funds are held while we verify provider receipts; no further paid work will start.';find('retry').hidden=true;find('resume').hidden=true;}
 if(job.run_state==='paused'&&job.billing?.state!=='reconciliation'&&job.error?.includes('BOOK_'))find('status').textContent=job.error+' Cancel to settle recorded usage and release unused funds, then approve a new limit if needed.';
 if(job.status==='ready'||job.status==='analyzed')find('resume').hidden=true;
 if(job.existing_book){find('payment').hidden=true;find('retry').hidden=true;find('resume').hidden=true;}
 if(job.analysis&&!analysisRendered){
  analysisRendered=true;find('analysis').hidden=false;
  for(const section of job.analysis.sections){
   const block=document.createElement('section'),title=document.createElement('h3'),body=document.createElement('p');title.className='font-serif text-xl';title.textContent=section.title;body.className='mt-2 text-sm leading-relaxed';body.textContent=section.summary;block.append(title,body);
   for(const idea of section.ideas||[]){const p=document.createElement('p');p.className='mt-3 text-sm';p.textContent=`${idea.name}: ${idea.explanation} Use when: ${idea.whenToUse} Limits: ${idea.limits}`;block.append(p);}
   const refs=document.createElement('p');refs.className='mt-2 text-xs text-soft';refs.textContent=(section.sourceRefs||[]).map((r:any)=>`Source lines ${r.startLine}–${r.endLine}`).join(', ');block.append(refs);find('analysis-notes').append(block);
  }
 }
 find('analysis').hidden=!job.analysis||!!job.artifacts;
 find('generate').hidden=job.status!=='analyzed';
 if(job.artifacts&&!rendered) {
  rendered=true;find('content').hidden=false;
  find('quality').hidden=false;
  find('quality').textContent=sourceReviewNotice(job.artifacts);
  find('previous').hidden=!previousReviewPath(job,job.user_id);
  renderMarkdown(job.artifacts['book.md']);void checkSkill(job.artifacts);

  const {data}=await supabase.storage.from('private-books').createSignedUrl(`${job.user_id}/${job.id}/source`,3600);
  if(data)find<HTMLAnchorElement>('source').href=data.signedUrl;else find('source').hidden=true;
 }
 if(job.cover_path&&find('cover').dataset.path!==job.cover_path) {
  const {data}=await supabase.storage.from('private-books').createSignedUrl(job.cover_path,3600);
  if(data){const cover=find('cover');cover.innerHTML=bookJacketMarkup({title:job.title,author:job.author||'',color:coverPalette(job).bg,coverAsset:data.signedUrl,loading:'eager'});cover.dataset.path=job.cover_path;cover.setAttribute('aria-label',`${job.title} cover`);cover.hidden=false;}
 }
}
async function run(action?:string) {
 if(running)return;running=true;
 try {
  if(!id)throw new Error('Choose a book from your shelf first.');
  const {data}=await supabase.auth.getSession();if(!data.session)throw new Error('Sign in to Answer with Books, then return to this private book link.');
  if(action==='retry'&&current?.source_import?.kind==='native'&&current.source_import.state==='failed'){await nativeBookWorker({action:'retry',id});action='status';}
  await paint((await bookWorker({action:action||'status',id})).job);
  if(location.hash==='#use-skill'&&!skillLinkOpened&&current.status==='ready'){skillLinkOpened=true;find<HTMLDetailsElement>('skill-tools').open=true;find('skill-tools').scrollIntoView({block:'start'});}
 }catch(e){find<HTMLDetailsElement>('management').open=true;find('status').textContent=e instanceof Error?e.message:'Processing paused. Please retry.';find('retry').hidden=false;}
 finally{running=false;}
}
setInterval(()=>{if(!document.hidden&&(current?.run_state==='queued'||current?.cover_status==='pending'||nativePending(current)))void run();},5000);
find('review-accept').addEventListener('change',updateReviewGate);
find('activate-review').addEventListener('change',updateActivationGate);
find('add-source').addEventListener('click',()=>openBookUpload({parentId:current.id,revisionKind:'append'}));
find('replace-source').addEventListener('click',()=>openBookUpload({parentId:current.id,revisionKind:'replace'}));
find('discard').addEventListener('click',async()=>{
 if(!revisionCanActivate||!current?.parent_job_id||!confirm('Discard this unactivated revision and its added source? Your current book and skill will stay available.'))return;
 const button=find<HTMLButtonElement>('discard');button.disabled=true;
 try {await bookWorker({action:'delete',id:current.id});location.assign(`/your-book/?id=${encodeURIComponent(current.parent_job_id)}`);}
 catch(error){button.disabled=false;find('version-message').textContent=error instanceof Error?error.message:'Could not discard this revision. Please retry.';}
});
find('activate').addEventListener('click',async()=>{
 if(find<HTMLButtonElement>('activate').disabled)return;
 activating=true;updateActivationGate();
 try {
  await bookWorker({action:'activate',id:current.id,reviewAccepted:true});
  revisionsKey='';await run();
  find('version-message').textContent='This is now your current book and skill. Previous versions remain in the history.';
  window.dispatchEvent(new Event('awb:book-added'));
 }catch(error){find('version-message').textContent=error instanceof Error?error.message:'Could not make this version current. Please retry.';}
 finally{activating=false;updateActivationGate();}
});
find('remote-copy').addEventListener('click',async()=>{
 const prompt=`$answer-with-books Use “${current.title}” from my private library to help with [describe my task]. Focus on book ${current.book_id||current.id}; retrieve relevant chapter methods, check their citations, and apply them to my situation.`;
 try{await navigator.clipboard.writeText(prompt);find('copy-status').textContent='Question copied. Paste it into your connected agent and replace the task placeholder.';}
 catch{find('remote-example').textContent=prompt;find('copy-status').textContent='Copy was blocked. Select and copy the question above.';}
});
find('install-copy').addEventListener('click',async()=>{
 try {await navigator.clipboard.writeText(find('install-command').textContent||'');find('copy-status').textContent='Install command copied. Run it in your terminal after signing in to the updated CLI.';}
 catch {find('copy-status').textContent='Copy was blocked. Select the install command above and copy it.';}
});
find('cover-retry').addEventListener('click',()=>void run('retry-cover'));
find('usage-show').addEventListener('click',async()=>{
 const box=find('usage');box.hidden=false;box.textContent='Loading saved usage…';
 try{const {receipt}=await bookWorker({action:'usage',id});box.textContent=`Recorded generation: ${receipt.calls} calls · ${receipt.inputTokens.toLocaleString()} input tokens · ${receipt.outputTokens.toLocaleString()} output tokens${receipt.customerCharge!=null?` · $${receipt.customerCharge.toFixed(2)} charged`:''}. ${receipt.notice}`;}
 catch{box.textContent='Usage is unavailable. Please retry.';}
});
find('pause').addEventListener('click',()=>void run('pause'));
find('generate').addEventListener('click',()=>void run('generate'));
find('analysis-download').addEventListener('click',()=>void downloadRevision(false,true));
find('audit-retry').addEventListener('click',()=>void checkSkill(current.artifacts));
find('retry').addEventListener('click',()=>void run('retry'));
find('copy').addEventListener('click',async()=>{
 const prompt=find<HTMLTextAreaElement>('prompt');
 const skill=Object.entries(current.artifacts).filter(([name])=>name.startsWith('skill/')).map(([name,value])=>`## ${name}\n${value}`).join('\n\n');
 prompt.value=bookAgentPrompt({title:current.title,author:current.author,url:location.href,digest:current.artifacts['book.md'],skill});
 try {await navigator.clipboard.writeText(prompt.value);find('copy-status').textContent='Copied. Open your AI chat, paste the prompt, add your task, and send.';}
 catch {find<HTMLDetailsElement>('skill-tools').open=true;find('copy-status').textContent='Clipboard access was blocked. Download the book and skill from Use with AI below.';}
});
async function downloadRevision(previous=false,analysis=false) {
 const button=find<HTMLButtonElement>(analysis?'analysis-download':previous?'previous':'download');button.disabled=true;
 try {
  const result=await bookWorker({action:analysis?'analysis-export':'export',id,reviewAccepted:find<HTMLInputElement>('review-accept').checked,...(previous?{revision:'previous'}:{})});
  const files=Object.fromEntries(Object.entries(result.files).map(([path,text])=>[path,strToU8(String(text))]));
  const blob=new Blob([zipSync(files) as Uint8Array<ArrayBuffer>],{type:'application/zip'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=analysis?'source-analysis.zip':previous?'book-and-skill-previous.zip':'book-and-skill.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  find('copy-status').textContent=previous?'Previous version downloaded. It may contain claims corrected in the current version.':'Downloaded with your private source text. Keep the bundle private and check the cited lines before use.';
 } catch(e) {find('copy-status').textContent=e instanceof Error?e.message:'Download failed. Please retry.';}
 finally {button.disabled=false;}
}
find('download').addEventListener('click',()=>void downloadRevision());
find('previous').addEventListener('click',()=>void downloadRevision(true));

void run();

find('quote').addEventListener('click',async()=>{const button=find<HTMLButtonElement>('quote');button.disabled=true;find('pay').hidden=true;priceQuote=null;try{const ceilingCents=Math.round(Number(find<HTMLInputElement>('limit').value)*100);if(!Number.isSafeInteger(ceilingCents)||ceilingCents<1)throw Error('Enter a positive spending limit.');const result=await bookWorker({action:'quote',id,ceilingCents});priceQuote=result.billing;if(priceQuote.state!=='quoted')return void run();if(priceQuote.pricingModel!=='token-usage-v1')throw Error('Usage-based pricing is not available on this server yet. No work was started.');const amount=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(priceQuote.priceCents/100);find('price-message').textContent=`Reserve up to ${amount}. Actual generation usage is charged at the rates below, including reviews and repairs, even on failure. Unused funds are released. This is a limit, not an estimate of completion cost. Authorization expires ${new Date(priceQuote.expiresAt).toLocaleString()}. `+(priceQuote.modelRates||[]).map((r:any)=>`${r.model}: customer rates per million tokens — input $${Number(r.inputUsdPerMillion)}, cached $${Number(r.cachedInputUsdPerMillion)}, output $${Number(r.outputUsdPerMillion)}.`).join(' ');find('pay').textContent=`Authorize up to ${amount} & start`;find('pay').hidden=false;}catch(error){find('price-message').textContent=error instanceof Error?error.message:'Price unavailable. Your source is saved.';}finally{button.disabled=false;}});
find('pay').addEventListener('click',async()=>{if(!priceQuote||priceQuote.state!=='quoted')return;const button=find<HTMLButtonElement>('pay');button.disabled=true;try{await bookWorker({action:'accept-price',id,quoteId:priceQuote.quoteId,acceptedCeilingCents:priceQuote.ceilingCents,pricingModel:'token-usage-v1'});priceQuote=null;await run();}catch(error){find('price-message').textContent=error instanceof Error?error.message:'Could not start. Check your balance.';}finally{button.disabled=false;}});

find('cancel').addEventListener('click',()=>void run('cancel'));

window.addEventListener('focus',()=>void run());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void run();});
