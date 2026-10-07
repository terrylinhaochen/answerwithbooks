import {matchLibraryFile} from './library-match.mjs';
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
 if(!/\.(pdf|epub|mobi|azw|azw3|docx|rtf|html|htm|xhtml|txt|text|md|markdown|rst|adoc|asciidoc)$/i.test(file.name))throw new Error('Choose a PDF, EPUB, DOCX, MOBI, AZW, AZW3, Markdown, HTML, RTF, or text file.');
}
async function invokeBookWorker(endpoint:string,body:Record<string,unknown>) {
 const { data, error } = await supabase.functions.invoke(endpoint,{body});
 if(error) {
  let message='Book processing is unavailable. Please try again.';
  try { message=(await error.context.json()).error||message; } catch { /* Network errors have no response. */ }
  throw new Error(message);
 }
 if(data?.error) throw new Error(data.error);return data;
}
export const bookWorker=(body:Record<string,unknown>)=>invokeBookWorker('book-process',body);
export const nativeBookWorker=(body:Record<string,unknown>)=>invokeBookWorker('book-native',body);
export type BookUploadContext={parentId?:string;revisionKind?:'append'|'replace'};
export function openBookUpload(context:BookUploadContext={}) {
 document.dispatchEvent(new CustomEvent('awb:open-book-upload',{detail:context}));
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
type LibraryBook={slug:string;title:string;author:string};
type UploadItem = {file:File;report?:SourceReport;error?:string;message:string;jobId?:string;sha?:string;libraryMatch?:LibraryBook;libraryBook?:LibraryBook};
export function mountBookUpload() {
 const dialog=document.querySelector<HTMLDialogElement>('#book-upload-dialog');if(!dialog)return;
 const form=dialog.querySelector<HTMLFormElement>('form')!;
 const library:LibraryBook[]=JSON.parse(dialog.querySelector('[data-upload-library]')?.textContent||'[]');
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
 let context:BookUploadContext={};
 const extractionMode=()=> (form.elements.namedItem('extractionMode') as HTMLSelectElement).value;
 const usesNative=(item:UploadItem)=>/\.(mobi|azw|azw3)$/i.test(item.file.name)||(/\.pdf$/i.test(item.file.name)&&extractionMode()==='technical');
 const revisionFields=()=>context.parentId?{parentId:context.parentId,revisionKind:context.revisionKind}:{};
 const checkNative=async()=>{const health=await nativeBookWorker({action:'health'});if(!health.available)throw new Error('Background extraction is unavailable. Try again later, or choose Text for a searchable PDF.');};
 const resolved=(item:UploadItem)=>!!(item.jobId||item.libraryBook);
 const href=(item:UploadItem)=>item.libraryBook?`/books/${item.libraryBook.slug}/`:`/your-book/?id=${item.jobId}`;
 const pending=()=>items.filter(item=>!resolved(item)&&!item.libraryMatch&&!item.error);
 function openIfComplete(){if(items.length&&items.every(resolved))location.assign(items.length===1?href(items[0]):'/processing/');}
 function reuse(item:UploadItem,job:{id:string;status:string}){item.jobId=job.id;item.message=job.status==='ready'?'Using your saved book, skill and cover. No upload or processing.':'Already in your books. Open it to view its saved progress.';}
 function draw() {
  list.replaceChildren();
  for(const item of items) {
   const row=document.createElement('li'),info=document.createElement('div');
   const name=document.createElement(resolved(item)?'a':'span');name.textContent=item.libraryBook?.title||item.file.name;
   if(name instanceof HTMLAnchorElement)name.href=href(item);
   const detail=document.createElement('small');detail.textContent=item.error||item.message;
   info.append(name,detail);row.append(info);
   if(item.libraryMatch){
    const book=item.libraryMatch,choices=document.createElement('div');choices.className='upload-reuse';
    detail.textContent=`Library match: ${book.title} by ${book.author}. Saved digest and AI prompt available.`;
    const use=document.createElement('button');use.type='button';use.textContent='Use library book';use.disabled=busy;
    use.addEventListener('click',()=>{item.libraryBook=book;item.libraryMatch=undefined;item.error=undefined;item.message='Using the saved library digest and AI prompt. No upload or processing.';draw();if(items.length===1)location.assign(href(item));});
    const own=document.createElement('button');own.type='button';own.textContent='Process this file instead';own.disabled=busy;
    own.addEventListener('click',()=>{item.libraryMatch=undefined;reviewed=false;try{validateFile(item.file);}catch(error){item.error=error instanceof Error?error.message:'Choose a readable source.';}draw();});
    choices.append(use,own);info.append(choices);
   }
   if(!resolved(item)){const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${item.file.name}`);remove.disabled=busy;remove.addEventListener('click',()=>{items=items.filter(other=>other!==item);draw();});row.append(remove);}
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
   if(items.length>=(context.parentId?1:maxBatchFiles)){status.textContent=context.parentId?'Choose one source for this version. Review and make it current before adding another.':'Choose up to ten files per batch. Remove a file to add another.';draw();return;}
   const item:UploadItem={file,message:`${(file.size/1024/1024).toFixed(1)} MB`};
   item.libraryMatch=context.parentId?undefined:matchLibraryFile(file.name,library)||undefined;
   if(!item.libraryMatch)try{validateFile(file);}catch(error){item.error=error instanceof Error?error.message:'Choose a readable source.';}
   items.push(item);
  }
  status.textContent=context.parentId?'This creates a new version for review. Your current book stays available.':items.some(item=>item.libraryMatch)?'Use the saved library book, or choose to process your specific file.':'We’ll check your saved books before reading or uploading new sources.';draw();
 }
 const resetDrag=()=>{dragDepth=0;drop.classList.remove('is-dragging');};
 input.addEventListener('change',()=>{selectFiles(Array.from(input.files||[]));input.value='';});
 clear.addEventListener('click',()=>{items=[];reviewed=false;input.value='';draw();status.textContent='Choose your sources.';input.focus();});
 form.querySelectorAll('select').forEach(select=>select.addEventListener('change',()=>{
  if(select.name==='extractionMode'){reviewed=false;for(const item of items.filter(item=>!resolved(item))){item.report=undefined;item.error=undefined;item.message='Ready to review';try{validateFile(item.file);}catch(error){item.error=error instanceof Error?error.message:'Choose a readable source.';}}}
  draw();
 }));
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
 document.addEventListener('awb:open-book-upload',event=>{
  if(busy)return;
  const next=(event as CustomEvent<BookUploadContext>).detail||{};
  if(next.parentId!==context.parentId||next.revisionKind!==context.revisionKind){items=[];reviewed=false;input.value='';}
  context=next;input.multiple=!context.parentId;
  dialog.querySelector('[data-upload-title]')!.textContent=context.parentId?context.revisionKind==='append'?'Add a source':'Replace the source':'Upload sources';
  dialog.querySelector('[data-upload-intro]')!.textContent=context.parentId?'Create a new version of this book and skill. Review it before making it current.':'Turn a book, research paper, or document into a readable artifact and a reusable skill.';
  dialog.querySelector<HTMLElement>('[data-upload-reuse-note]')!.hidden=!!context.parentId;
  dialog.querySelector('[data-upload-limits]')!.textContent=context.parentId?`Choose one source up to ${maxFileMB} MB. Additions stay together in one book and skill.`:`Up to ten files, each up to ${maxFileMB} MB. Long books are read in sections automatically. PDFs need selectable text; scanned pages need OCR first.`;
  status.textContent=context.parentId?'Your current book stays available until you approve the new version.':'Each file becomes a separate book and skill. Ten new sources per day.';
  draw();dialog.showModal();input.focus();
 });
 document.querySelectorAll('[data-open-book-request]').forEach(button=>button.addEventListener('click',()=>openBookUpload()));
 close.addEventListener('click',()=>{if(!busy)dialog.close();});dialog.addEventListener('close',resetDrag);dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!pending().length)return;busy=true;draw();login.hidden=true;
  try {
   const {data}=await supabase.auth.getSession();if(!data.session){login.hidden=false;throw new Error('Sign in first to keep your books private.');}
   if(!reviewed){
    for(const item of pending()){
     try{
      item.message='Checking your saved books…';draw();
      item.sha??=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await item.file.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
      if(!context.parentId&&!usesNative(item)){const cached=await bookWorker({action:'lookup',sha:item.sha});
       if(cached.reused&&cached.job){reuse(item,cached.job);draw();continue;}
      }
      if(usesNative(item)){await checkNative();item.message='Ready for background extraction. The original file uploads first; your book and skill stay together.';draw();continue;}
      item.report=await extractFullBook(item.file,message=>{item.message=message;draw();});
      if(item.report.text.trim().length<100)throw new Error('Not enough readable text. Upload a searchable document.');
      const sections=splitSource(item.report.text,item.report.headings).chunks.length;
      item.message=`${item.report.text.trim().split(/\s+/).length.toLocaleString()} words · about ${item.report.estimatedTokens.toLocaleString()} source tokens · ${sections} reading sections${item.report.text.length>1000000?'. Long book: we’ll process it in sections and keep one book and skill.':''}`;
     }catch(error){item.error=error instanceof Error?error.message:'Could not read this source.';}
     draw();
    }
    reviewed=true;status.textContent=pending().length?'Sources reviewed. Only new sources are sent to our AI provider. The estimates above describe the source, not a price or a guarantee of complete extraction.':items.some(resolved)?'Using your saved books. Open them above; no new upload or processing.':'No readable sources remain. Remove these files and choose others.';
    if(items.every(item=>!!item.jobId))openIfComplete();
    return;
   }
   // Another tab or a concurrent upload may have saved a reviewed source.
   for(const item of pending().filter(item=>!context.parentId&&!usesNative(item))){
    const cached=await bookWorker({action:'lookup',sha:item.sha});
    if(cached.reused&&cached.job)reuse(item,cached.job);
   }
   draw();
   if(!pending().length){status.textContent='Using your saved books. No new upload or processing.';if(!items.some(item=>item.libraryBook))openIfComplete();return;}
   const health=pending().some(item=>!usesNative(item))?await bookWorker({action:'health'}):null;
   if(health&&!health.available)throw new Error('Book processing is unavailable. Please try again later.');
   if(pending().some(usesNative))await checkNative();
   const options=Object.fromEntries(['mode','depth','purpose'].map(name=>[name,(form.elements.namedItem(name) as HTMLSelectElement).value]));
   status.textContent='Keep this dialog open until the files finish uploading. Processing then continues in the background.';
   for(const item of pending()){
    try {
     item.message='Uploading…';draw();
     if(usesNative(item)){
      const result=await nativeBookWorker({action:'prepare',name:item.file.name,size:item.file.size,sha:item.sha,extractionMode:extractionMode(),options,...revisionFields()});
      if(result.reused){reuse(item,result.job);draw();continue;}
      if(!result.upload){if(!result.job?.id)throw new Error('Could not prepare your original file upload. Please retry.');reuse(item,result.job);draw();continue;}
      const {error}=await supabase.storage.from('private-books').uploadToSignedUrl(result.upload.path,result.upload.token,new Blob([item.file],{type:'application/octet-stream'}),{contentType:'application/octet-stream'});
      if(error)throw new Error('Upload failed. Remove this file and choose it again to retry.');
      await nativeBookWorker({action:'finalize',id:result.job.id});item.jobId=result.job.id;item.message='Saved · extracting in the background';draw();continue;
     }
     const extraction=item.report!;
     const sha=item.sha!;
     const large=extraction.text.length>1000000;
     if(large&&!health.staged_uploads)throw new Error('Your book is readable. Long-book processing is not enabled on this server yet. Your file has not been uploaded.');
     const sourceText=new TextEncoder().encode(extraction.text);
     const textSha=large?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',sourceText))).map(x=>x.toString(16).padStart(2,'0')).join(''):undefined;
     const result=await bookWorker({action:large?'prepare':'create',name:item.file.name,size:item.file.size,...(large?{textSha,textBytes:sourceText.byteLength}:{text:extraction.text}),sha,extraction:{...extraction,text:undefined},options,...revisionFields()});
     if(result.reused){reuse(item,result.job);draw();continue;}
     if(result.upload){const {error}=await supabase.storage.from('private-books').uploadToSignedUrl(result.upload.path,result.upload.token,new Blob([item.file],{type:'application/octet-stream'}),{contentType:'application/octet-stream'});if(error)throw new Error('Upload failed. Remove this file and choose it again to retry.');}
     if(result.textUpload){const {error}=await supabase.storage.from('private-books').uploadToSignedUrl(result.textUpload.path,result.textUpload.token,new Blob([sourceText],{type:'text/plain'}),{contentType:'text/plain'});if(error)throw new Error('Could not save the extracted text. Choose the same book again to resume.');}
     await bookWorker({action:result.textUpload?'finalize':'enqueue',id:result.job.id});item.jobId=result.job.id;item.message=result.job.status==='ready'?'Already in your books':'Saved · processing in the background';
    }catch(error){item.error=error instanceof Error?error.message:'Upload failed. Remove this file and choose it again to retry.';}
    draw();
   }
   const saved=items.filter(resolved);status.textContent=`${saved.length} source${saved.length===1?'':'s'} saved. You can leave this page. ${items.some(item=>item.error)?'Some files need attention; your other sources will continue.':''}${items.some(item=>item.libraryMatch)?' Choose a library match above to finish.':''}`;
   window.dispatchEvent(new Event('awb:book-added'));
   if(!items.some(item=>item.libraryBook))openIfComplete();
  }catch(error){status.textContent=error instanceof Error?error.message:'Upload failed. Please try again.';}
  finally{busy=false;draw();}
 });
 draw();
}
