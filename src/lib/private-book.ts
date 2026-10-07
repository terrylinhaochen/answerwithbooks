import {auditUpstream} from './upstream-book';
import {zipSync,strToU8} from 'fflate';
import {supabase} from './supabase';
import {bookWorker} from './book-upload';
import {bookAgentPrompt} from '../../supabase/functions/_shared/book-handoff.mjs';
const root=document.querySelector<HTMLElement>('[data-private-book]')!;
const find=<T extends HTMLElement>(name:string)=>root.querySelector<T>(`[data-job-${name}]`)!;
const id=new URL(location.href).searchParams.get('id');
let current:any, running=false, rendered=false, analysisRendered=false, auditPassed=false, hasFindings=false;
function updateReviewGate(){const blocked=!auditPassed||(hasFindings&&!find<HTMLInputElement>('review-accept').checked);find<HTMLButtonElement>('copy').disabled=blocked;find<HTMLButtonElement>('download').disabled=blocked;}
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
async function paint(job:any) {
 current=job;find('title').textContent=job.title;find('author').textContent=job.author==='Unknown author'?'Author not identified':job.author;
 find<HTMLProgressElement>('progress').value=job.status==='ready'?100:job.artifacts?90:Math.round(job.cursor/(job.total_sections+2)*85);
 find('pause').hidden=job.run_state!=='queued';find('retry').hidden=!['failed','paused','manual'].includes(job.run_state);
 find('status').textContent=job.run_state==='failed'?job.error||'Processing needs a retry.':job.run_state==='paused'?'Paused. A section already in progress may finish. Resume when you are ready.':job.status==='analyzed'?'Analysis ready. Review the notes below.':job.status==='ready'?'Book, skill, and cover ready.':job.artifacts?'Book and skill ready. Creating your cover…':job.overview_total&&job.cursor===job.total_sections?`All source sections read. Assembling your book · ${job.overview_completed} of ${job.overview_total} overview groups`: `Creating your book and skill · ${job.cursor} of ${job.total_sections} source sections read`;
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
  try {
   const review=JSON.parse(job.artifacts['quality-review.json']||'{}');
   if(review.version===2) {
    find('quality').hidden=false;
    find('quality').textContent='This version passed automated source-support checks. Review important claims against the bundled source.';
    find('previous').hidden=!review.previousRevisionPath;
   }
  }catch{}
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
  await paint((await bookWorker({action:action||'status',id})).job);
  if(current.run_state==='manual'&&!['ready','analyzed'].includes(current.status))await paint((await bookWorker({action:'enqueue',id})).job);
 }catch(e){find('status').textContent=e instanceof Error?e.message:'Processing paused. Please retry.';find('retry').hidden=false;}
 finally{running=false;}
}
setInterval(()=>{if(!document.hidden&&current?.run_state==='queued')void run();},5000);
find('review-accept').addEventListener('change',updateReviewGate);
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
