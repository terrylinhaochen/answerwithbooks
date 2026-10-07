import {extractUpstream,analyzeUpstream} from './upstream-book';
import { supabase } from './supabase';
import uploadLimits from '../../supabase/functions/_shared/book-upload-limits.json';
import {splitSource} from '../../supabase/functions/_shared/book-sections.mjs';
import {maxBatchFiles} from '../../supabase/functions/_shared/book-options.mjs';
import type {SourceReport} from './upstream-book';
const maxFileMB=uploadLimits.maxFileBytes/1024/1024;
function validateFile(file:File) {
 if(file.size===0)throw new Error('Choose a non-empty source file.');
 if(file.size>uploadLimits.maxFileBytes)throw new Error(`Choose a source file up to ${maxFileMB} MB.`);
 if(!/\.(pdf|epub|docx|rtf|html|htm|xhtml|txt|text|md|markdown|rst|adoc|asciidoc)$/i.test(file.name))throw new Error('Choose a PDF, EPUB, DOCX, Markdown, HTML, RTF, or text file. Convert MOBI/AZW to EPUB first; images need OCR.');
}
export async function bookWorker(body: Record<string,unknown>) {
 const { data, error } = await supabase.functions.invoke('book-process',{body});
 if(error) {
  let message='Book processing is unavailable. Please try again.';
  try { message=(await error.context.json()).error||message; } catch { /* Network errors have no response. */ }
  throw new Error(message);
 }
 if(data.error) throw new Error(data.error);return data;
}
export async function extractFullBook(file:File,progress:(s:string)=>void) {
 validateFile(file);
 if(!/\.pdf$/i.test(file.name)) { progress('Reading your source…');return extractUpstream(file); }
 const [pdfjs,{default:workerSrc}]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
 pdfjs.GlobalWorkerOptions.workerSrc=workerSrc;
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableXfa:false});
 task.onPassword=()=>{void task.destroy();};
 try {
  const pdf=await task.promise;if(pdf.numPages>uploadLimits.maxPdfPages)throw new Error('This PDF is too long for the current upload limit.');
  let text='';let readableCharacters=0;
  for(let n=1;n<=pdf.numPages;n++) {
   progress(`Reading page ${n} of ${pdf.numPages}…`);
   const page=await pdf.getPage(n);const content=await page.getTextContent();
   const value=content.items.map(item=>'str' in item?item.str+(item.hasEOL?'\n':' '):'').join('');
   readableCharacters+=value.trim().length;
   if(value.trim().length<20 && n>2 && n<pdf.numPages-1) throw new Error('This PDF contains pages without readable text. Run OCR first, then upload the searchable PDF.');
   text+=`\n[Page ${n}]\n${value}\n`;page.cleanup();
   if(text.length>uploadLimits.maxTextCharacters)throw new Error('This source exceeds the current six-million-character processing capacity. Your original file has not been changed.');
  }
  if(readableCharacters===0)throw new Error('This PDF contains pages without readable text. Run OCR first, then upload the searchable PDF.');
  progress('Identifying the source structure…');return analyzeUpstream(text);
 }finally{await task.destroy();}
}
type UploadItem = {file:File;report?:SourceReport;error?:string;message:string;jobId?:string};
export function mountBookUpload() {
 const dialog=document.querySelector<HTMLDialogElement>('#book-upload-dialog');if(!dialog)return;
 const form=dialog.querySelector<HTMLFormElement>('form')!;
 const input=dialog.querySelector<HTMLInputElement>('input[type=file]')!;
 const submit=dialog.querySelector<HTMLButtonElement>('[data-upload-submit]')!;
 const status=dialog.querySelector<HTMLElement>('[data-upload-status]')!;
 const login=dialog.querySelector<HTMLAnchorElement>('[data-upload-login]')!;
 const queue=dialog.querySelector<HTMLAnchorElement>('[data-upload-queue]')!;
 const drop=dialog.querySelector<HTMLElement>('[data-upload-drop]')!;
 const list=dialog.querySelector<HTMLUListElement>('[data-upload-files]')!;
 const clear=dialog.querySelector<HTMLButtonElement>('[data-upload-clear]')!;
 const close=dialog.querySelector<HTMLButtonElement>('[data-close-book-upload]')!;
 let busy=false,dragDepth=0,reviewed=false;
 let items:UploadItem[]=[];
 const pending=()=>items.filter(item=>!item.jobId&&!item.error);
 function draw() {
  list.replaceChildren();
  for(const item of items) {
   const row=document.createElement('li'),info=document.createElement('div');
   const name=document.createElement(item.jobId?'a':'span');name.textContent=item.file.name;
   if(name instanceof HTMLAnchorElement)name.href=`/your-book/?id=${item.jobId}`;
   const detail=document.createElement('small');detail.textContent=item.error||item.message;
   info.append(name,detail);row.append(info);
   if(!item.jobId){const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${item.file.name}`);remove.disabled=busy;remove.addEventListener('click',()=>{items=items.filter(other=>other!==item);draw();});row.append(remove);}
   list.append(row);
  }
  clear.hidden=!items.length;clear.disabled=busy;
  input.disabled=busy;close.disabled=busy;
  form.querySelectorAll<HTMLSelectElement>('select').forEach(select=>select.disabled=busy);
  submit.disabled=busy||!pending().length;
  submit.textContent=reviewed?(form.elements.namedItem('mode') as HTMLSelectElement).value==='analysis'?'Analyze sources':'Create books & skills':'Review sources';
  queue.hidden=!items.some(item=>item.jobId);
  drop.setAttribute('aria-disabled',String(busy));
 }
 function selectFiles(files:File[]) {
  if(busy)return;
  reviewed=false;login.hidden=true;
  for(const file of files){
   if(items.some(item=>item.file.name===file.name&&item.file.size===file.size&&item.file.lastModified===file.lastModified))continue;
   if(items.length>=maxBatchFiles){status.textContent='Choose up to ten files per batch. Remove a file to add another.';draw();return;}
   const item:UploadItem={file,message:`${(file.size/1024/1024).toFixed(1)} MB`};
   try{validateFile(file);}catch(error){item.error=error instanceof Error?error.message:'Choose a readable source.';}
   items.push(item);
  }
  status.textContent='Review the sources before processing. Each file gets its own book and skill.';draw();
 }
 const resetDrag=()=>{dragDepth=0;drop.classList.remove('is-dragging');};
 input.addEventListener('change',()=>{selectFiles(Array.from(input.files||[]));input.value='';});
 clear.addEventListener('click',()=>{items=[];reviewed=false;input.value='';draw();status.textContent='Choose your sources.';input.focus();});
 form.querySelectorAll('select').forEach(select=>select.addEventListener('change',draw));
 drop.addEventListener('dragenter',event=>{event.preventDefault();if(!busy&&event.dataTransfer?.types.includes('Files')){dragDepth++;drop.classList.add('is-dragging');}});
 drop.addEventListener('dragover',event=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect=busy?'none':'copy';});
 drop.addEventListener('dragleave',()=>{if(--dragDepth<=0)resetDrag();});
 drop.addEventListener('drop',event=>{
  event.preventDefault();resetDrag();if(busy||!event.dataTransfer?.types.includes('Files'))return;
  const entries=Array.from(event.dataTransfer.items||[]);
  if(entries.some(item=>item.webkitGetAsEntry?.()?.isDirectory)){status.textContent='Select files inside the folder, then drop them here.';return;}
  selectFiles(Array.from(event.dataTransfer.files||[]));
 });
 for(const eventName of ['dragover','drop'])document.addEventListener(eventName,event=>{if(dialog.open&&(event as DragEvent).dataTransfer?.types.includes('Files'))event.preventDefault();});
 document.querySelectorAll('[data-open-book-request]').forEach(button=>button.addEventListener('click',()=>{dialog.showModal();input.focus();}));
 close.addEventListener('click',()=>{if(!busy)dialog.close();});dialog.addEventListener('close',resetDrag);dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!pending().length)return;busy=true;draw();login.hidden=true;
  try {
   const {data}=await supabase.auth.getSession();if(!data.session){login.hidden=false;throw new Error('Sign in first to keep your books private.');}
   if(!reviewed){
    for(const item of pending()){
     try{
      item.report=await extractFullBook(item.file,message=>{item.message=message;draw();});
      if(item.report.text.trim().length<100)throw new Error('Not enough readable text. Upload a searchable document.');
      const sections=splitSource(item.report.text,item.report.headings).chunks.length;
      item.message=`${item.report.text.trim().split(/\s+/).length.toLocaleString()} words · about ${item.report.estimatedTokens.toLocaleString()} source tokens · ${sections} reading sections${item.report.text.length>1000000?'. Long book: we’ll process it in sections and keep one book and skill.':''}`;
     }catch(error){item.error=error instanceof Error?error.message:'Could not read this source.';}
     draw();
    }
    reviewed=true;status.textContent=pending().length?'Sources reviewed. Processing sends their text to our AI provider. The estimates above describe the source, not a price or a guarantee of complete extraction.':'No readable sources remain. Remove these files and choose others.';
    return;
   }
   const health=await bookWorker({action:'health'});if(!health.available)throw new Error('Book processing is unavailable. Please try again later.');
   const options=Object.fromEntries(['mode','depth','purpose'].map(name=>[name,(form.elements.namedItem(name) as HTMLSelectElement).value]));
   status.textContent='Keep this dialog open until the files finish uploading. Processing then continues in the background.';
   for(const item of pending()){
    try {
     item.message='Uploading…';draw();
     const extraction=item.report!;
     const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await item.file.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
     const large=extraction.text.length>1000000;
     if(large&&!health.staged_uploads)throw new Error('Your book is readable. Long-book processing is not enabled on this server yet. Your file has not been uploaded.');
     const sourceText=new TextEncoder().encode(extraction.text);
     const textSha=large?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',sourceText))).map(x=>x.toString(16).padStart(2,'0')).join(''):undefined;
     const result=await bookWorker({action:large?'prepare':'create',name:item.file.name,size:item.file.size,...(large?{textSha,textBytes:sourceText.byteLength}:{text:extraction.text}),sha,extraction:{...extraction,text:undefined},options});
     if(result.upload){const {error}=await supabase.storage.from('private-books').uploadToSignedUrl(result.upload.path,result.upload.token,new Blob([item.file],{type:'application/octet-stream'}),{contentType:'application/octet-stream'});if(error)throw new Error('Upload failed. Remove this file and choose it again to retry.');}
     if(result.textUpload){const {error}=await supabase.storage.from('private-books').uploadToSignedUrl(result.textUpload.path,result.textUpload.token,new Blob([sourceText],{type:'text/plain'}),{contentType:'text/plain'});if(error)throw new Error('Could not save the extracted text. Choose the same book again to resume.');}
     await bookWorker({action:result.textUpload?'finalize':'enqueue',id:result.job.id});item.jobId=result.job.id;item.message=result.job.status==='ready'?'Already in your books':'Saved · processing in the background';
    }catch(error){item.error=error instanceof Error?error.message:'Upload failed. Remove this file and choose it again to retry.';}
    draw();
   }
   const saved=items.filter(item=>item.jobId);status.textContent=`${saved.length} source${saved.length===1?'':'s'} saved. You can leave this page. ${items.some(item=>item.error)?'Some files need attention; your other sources will continue.':''}`;
   window.dispatchEvent(new Event('awb:book-added'));
   if(saved.length&&saved.length===items.length)location.assign(saved.length===1?`/your-book/?id=${saved[0].jobId}`:'/processing/');
  }catch(error){status.textContent=error instanceof Error?error.message:'Upload failed. Please try again.';}
  finally{busy=false;draw();}
 });
 draw();
}
