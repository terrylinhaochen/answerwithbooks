import {zipSync,strToU8} from 'fflate';
import {supabase} from './supabase';
import {bookWorker} from './book-upload';
import {bookAgentPrompt} from '../../supabase/functions/_shared/book-handoff.mjs';
const root=document.querySelector<HTMLElement>('[data-private-book]')!;
const find=<T extends HTMLElement>(name:string)=>root.querySelector<T>(`[data-job-${name}]`)!;
const id=new URL(location.href).searchParams.get('id');
let current:any, running=false, rendered=false;
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
 current=job;find('title').textContent=job.title;find('author').textContent=job.author;
 find<HTMLProgressElement>('progress').value=job.status==='ready'?100:job.artifacts?90:Math.round(job.cursor/(job.total_sections+2)*85);
 find('status').textContent=job.status==='ready'?'Book, skill, and cover ready.':job.artifacts?'Book and skill ready. Creating your cover…':`Creating your book and skill · ${job.cursor} of ${job.total_sections} source sections read`;
 if(job.status==='ready')find('resume').hidden=true;
 if(job.artifacts&&!rendered) {
  rendered=true;find('content').hidden=false;renderMarkdown(job.artifacts['book.md']);
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
async function run() {
 if(running)return;running=true;find('retry').hidden=true;
 try {
  if(!id)throw new Error('Choose a book from your shelf first.');
  const {data}=await supabase.auth.getSession();if(!data.session)throw new Error('Sign in to AWB, then return to this private book link.');
  await paint((await bookWorker({action:'status',id})).job);
  while(current.status!=='ready') {
   const result=await bookWorker({action:'process',id});await paint(result.job);
   if(result.busy)await new Promise(resolve=>setTimeout(resolve,3000));
  }
 }catch(e){find('status').textContent=e instanceof Error?e.message:'Processing paused. Please retry.';find('retry').hidden=false;}
 finally{running=false;}
}
find('retry').addEventListener('click',()=>void run());
find('copy').addEventListener('click',async()=>{
 const prompt=find<HTMLTextAreaElement>('prompt');
 try {await navigator.clipboard.writeText(prompt.value);find('copy-status').textContent='Copied. Paste into your agent and add your question or task.';}
 catch {prompt.hidden=false;prompt.focus();prompt.select();find('copy-status').textContent='Copy was blocked. Select and copy the prompt below.';}
});
find('download').addEventListener('click',()=>{
 const files=Object.fromEntries(Object.entries(current.artifacts).map(([path,text])=>[path,strToU8(String(text))]));
 const blob=new Blob([zipSync(files) as Uint8Array<ArrayBuffer>],{type:'application/zip'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='book-and-skill.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
void run();
