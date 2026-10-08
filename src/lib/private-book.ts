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
let current:any, running=false, rendered=false, analysisRendered=false, auditPassed=false, hasFindings=false, activating=false;
let revisionsKey='',revisionCanActivate=false;
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
 } catch {find('audit').textContent='The skill check could not finish. Retry before exporting.';find('audit-retry').hidden=false;}
}

const renderMarkdown=(text:string)=>{
 const box=find('reading');box.replaceChildren();
 const body=text.replace(/^---\n[\s\S]*?\n---\n/,'').replace(/\n## Use this book in an agent[\s\S]*$/,'');
 const inline=(el:HTMLElement,text:string)=>{
  for(const part of text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)) {
   if(part.startsWith('**')&&part.endsWith('**')) {const strong=document.createElement('strong');strong.textContent=part.slice(2,-2);el.append(strong);}
   else if(part.startsWith('`')&&part.endsWith('`')) {const code=document.createElement('code');code.textContent=part.slice(1,-1);code.className='break-all text-sm';el.append(code);}
   else el.append(document.createTextNode(part));
  }
 };
 for(const raw of body.split(/\n\n+/)) {
  const block=raw.trim();if(!block)continue;
  const heading=block.match(/^(#{1,3}) (.+)$/);
  if(heading) {const el=document.createElement(`h${Math.min(3,heading[1].length)}`);el.className='mt-7 font-serif text-2xl';el.textContent=heading[2];box.append(el);}
  else if(/^1\. /.test(block)) {const ol=document.createElement('ol');ol.className='mt-4 list-decimal space-y-2 pl-6';for(const line of block.split('\n')){const li=document.createElement('li');inline(li,line.replace(/^\d+\. /,''));ol.append(li);}box.append(ol);}
  else {const el=document.createElement('p');el.className='mt-4 whitespace-pre-wrap break-words leading-relaxed';inline(el,block);box.append(el);}
 }

};
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
 current=job;find('cover-retry').hidden=job.cover_status!=='failed';find('usage-show').hidden=!job.cursor&&!job.artifacts;find('title').textContent=job.title;find('author').textContent=job.author==='Unknown author'?'Author not identified':job.author;
 void showVersions(job);
 if(nativePending(job))find('progress').removeAttribute('value');
 else find<HTMLProgressElement>('progress').value=job.status==='ready'?100:job.artifacts?90:Math.round((job.cursor||0)/((job.total_sections||0)+2)*85);
 find('pause').hidden=job.run_state!=='queued'||nativePending(job);find('retry').hidden=nativePending(job)||(!['failed','paused','manual'].includes(job.run_state)&&job.source_import?.state!=='failed');
 find('status').textContent=nativePending(job)?job.source_import.state==='processing'?'Reading your original file in the background…':'Your original file is saved. Waiting for background extraction…':job.source_import?.state==='failed'?job.error||'Could not read this source. Retry background extraction.':job.run_state==='failed'?job.error||'Processing needs a retry.':job.run_state==='paused'?'Paused. A section already in progress may finish. Resume when you are ready.':job.status==='analyzed'?'Analysis ready. Review the notes below.':job.status==='ready'?job.cover_path?'Book, skill, and cover ready.':job.cover_status==='failed'?'Book and skill ready. Cover failed; you can retry it below.':'Book and skill ready. Cover is being created separately.':job.artifacts?'Book and skill ready. Creating your cover…':job.overview_total&&job.cursor===job.total_sections?`All source sections read. Assembling your book · ${job.overview_completed} of ${job.overview_total} overview groups`: `Creating your book and skill · ${job.completed_sections??job.cursor} of ${job.total_sections} source sections read`;
 if(job.status==='ready'||job.status==='analyzed')find('resume').hidden=true;
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
  const skill=Object.entries(job.artifacts).filter(([name])=>name.startsWith('skill/')).map(([name,value])=>`## ${name}\n${value}`).join('\n\n');
  find<HTMLTextAreaElement>('prompt').value=bookAgentPrompt({title:job.title,author:job.author,url:location.href,digest:job.artifacts['book.md'],skill});
  const {data}=await supabase.storage.from('private-books').createSignedUrl(`${job.user_id}/${job.id}/source`,3600);
  if(data)find<HTMLAnchorElement>('source').href=data.signedUrl;else find('source').hidden=true;
 }
 if(job.cover_path&&!find<HTMLImageElement>('cover').getAttribute('src')) {
  const {data}=await supabase.storage.from('private-books').createSignedUrl(job.cover_path,3600);
  if(data){find<HTMLImageElement>('cover').src=data.signedUrl;find('cover').hidden=false;}
 }
}
async function run(action?:string) {
 if(running)return;running=true;
 try {
  if(!id)throw new Error('Choose a book from your shelf first.');
  const {data}=await supabase.auth.getSession();if(!data.session)throw new Error('Sign in to Answer with Books, then return to this private book link.');
  if(action==='retry'&&current?.source_import?.kind==='native'&&current.source_import.state==='failed'){await nativeBookWorker({action:'retry',id});action='status';}
  await paint((await bookWorker({action:action||'status',id})).job);
  if(current.run_state==='manual'&&!nativePending(current)&&!['ready','analyzed'].includes(current.status))await paint((await bookWorker({action:'enqueue',id})).job);
 }catch(e){find('status').textContent=e instanceof Error?e.message:'Processing paused. Please retry.';find('retry').hidden=false;}
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
 catch{find<HTMLTextAreaElement>('prompt').value=prompt;find('prompt').hidden=false;find('copy-status').textContent='Copy was blocked. Select and copy the question below.';}
});
find('install-copy').addEventListener('click',async()=>{
 try {await navigator.clipboard.writeText(find('install-command').textContent||'');find('copy-status').textContent='Install command copied. Run it in your terminal after signing in to the updated CLI.';}
 catch {find('copy-status').textContent='Copy was blocked. Select the install command above and copy it.';}
});
find('cover-retry').addEventListener('click',()=>void run('retry-cover'));
find('usage-show').addEventListener('click',async()=>{
 const box=find('usage');box.hidden=false;box.textContent='Loading saved usage…';
 try{const {receipt}=await bookWorker({action:'usage',id});box.textContent=`Recorded generation: ${receipt.calls} calls · ${receipt.inputTokens.toLocaleString()} input tokens · ${receipt.outputTokens.toLocaleString()} output tokens · $${receipt.knownProviderEstimateUsd.toFixed(4)} known provider estimate${receipt.unpricedCalls?` · ${receipt.unpricedCalls} calls not priced`:''}. ${receipt.notice}`;}
 catch{box.textContent='Usage is unavailable. Please retry.';}
});
find('pause').addEventListener('click',()=>void run('pause'));
find('generate').addEventListener('click',()=>void run('generate'));
find('analysis-download').addEventListener('click',()=>void downloadRevision(false,true));
find('audit-retry').addEventListener('click',()=>void checkSkill(current.artifacts));
find('retry').addEventListener('click',()=>void run('retry'));
find('copy').addEventListener('click',async()=>{
 const prompt=find<HTMLTextAreaElement>('prompt');
 try {await navigator.clipboard.writeText(prompt.value);find('copy-status').textContent='Copied. Open your AI chat, paste the prompt, add your task, and send.';}
 catch {prompt.hidden=false;prompt.focus();prompt.select();find('copy-status').textContent='Copy was blocked. Select and copy the prompt below.';}
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
