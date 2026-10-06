import {extractUpstream,analyzeUpstream} from './upstream-book';
import { supabase } from './supabase';
import uploadLimits from '../../supabase/functions/_shared/book-upload-limits.json';
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
   if(text.length>uploadLimits.maxTextCharacters)throw new Error('This source exceeds the 1.2 million character text limit. Split it into smaller documents.');
  }
  if(readableCharacters===0)throw new Error('This PDF contains pages without readable text. Run OCR first, then upload the searchable PDF.');
  progress('Identifying the source structure…');return analyzeUpstream(text);
 }finally{await task.destroy();}
}
export function mountBookUpload() {
 const dialog=document.querySelector<HTMLDialogElement>('#book-upload-dialog');if(!dialog)return;
 const form=dialog.querySelector<HTMLFormElement>('form')!;
 const input=dialog.querySelector<HTMLInputElement>('input[type=file]')!;
 const submit=dialog.querySelector<HTMLButtonElement>('[data-upload-submit]')!;
 const status=dialog.querySelector<HTMLElement>('[data-upload-status]')!;
 const login=dialog.querySelector<HTMLAnchorElement>('[data-upload-login]')!;
 const drop=dialog.querySelector<HTMLElement>('[data-upload-drop]')!;
 const dropTitle=dialog.querySelector<HTMLElement>('[data-upload-drop-title]')!;
 const selection=dialog.querySelector<HTMLElement>('[data-upload-selection]')!;
 const filename=dialog.querySelector<HTMLElement>('[data-upload-filename]')!;
 const filesize=dialog.querySelector<HTMLElement>('[data-upload-filesize]')!;
 const clear=dialog.querySelector<HTMLButtonElement>('[data-upload-clear]')!;
 const close=dialog.querySelector<HTMLButtonElement>('[data-close-book-upload]')!;
 let busy=false,valid=false,dragDepth=0;
 let selectedFile:File|null=null;
 function resetDrag(){dragDepth=0;drop.classList.remove('is-dragging');}
 function selectFiles(files:File[]) {
  if(busy)return;
  selectedFile=files.length===1?files[0]:null;valid=false;login.hidden=true;
  selection.hidden=!selectedFile;
  filename.textContent=selectedFile?.name||'';
  filesize.textContent=selectedFile?selectedFile.size>=1024*1024?`${(selectedFile.size/1024/1024).toFixed(1)} MB`:`${Math.ceil(selectedFile.size/1024)} KB`:'';
  dropTitle.textContent=selectedFile?'Drop another file':'Drop your file here';
  try {
   if(files.length>1)throw new Error('Choose one file at a time.');
   if(selectedFile){validateFile(selectedFile);valid=true;status.textContent='Ready to create your skill and book.';}
   else status.textContent='Choose a source file first.';
  }catch(error){status.textContent=error instanceof Error?error.message:'Choose a readable source file.';}
  input.setAttribute('aria-invalid',String(!!selectedFile&&!valid));submit.disabled=!valid;
 }
 input.addEventListener('change',()=>selectFiles(Array.from(input.files||[])));
 clear.addEventListener('click',()=>{input.value='';selectFiles([]);input.focus();});
 drop.addEventListener('dragenter',event=>{event.preventDefault();if(!busy&&event.dataTransfer?.types.includes('Files')){dragDepth++;drop.classList.add('is-dragging');}});
 drop.addEventListener('dragover',event=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect=busy?'none':'copy';});
 drop.addEventListener('dragleave',()=>{if(--dragDepth<=0)resetDrag();});
 drop.addEventListener('drop',event=>{
  event.preventDefault();resetDrag();if(busy)return;
  if(!event.dataTransfer?.types.includes('Files'))return;
  input.value='';
  const items=Array.from(event.dataTransfer?.items||[]);
  if(items.some(item=>item.webkitGetAsEntry?.()?.isDirectory)){selectFiles([]);status.textContent='Choose a single file instead of a folder.';return;}
  selectFiles(Array.from(event.dataTransfer?.files||[]));
 });
 // Prevent the browser from navigating to a file dropped outside the target.
 for(const eventName of ['dragover','drop'])document.addEventListener(eventName,event=>{if(dialog.open&&(event as DragEvent).dataTransfer?.types.includes('Files'))event.preventDefault();});
 document.querySelectorAll('[data-open-book-request]').forEach(button=>button.addEventListener('click',()=>{dialog.showModal();input.focus();void supabase.auth.getSession().then(({data})=>{if(!busy&&!selectedFile)status.textContent=data.session?'Three new books per day.':'Sign in to save your book. Three new books per day.';});}));
 close.addEventListener('click',()=>{if(!busy)dialog.close();});
 dialog.addEventListener('close',resetDrag);
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const file=selectedFile;if(!file||!valid)return;
  busy=true;submit.disabled=true;input.disabled=true;clear.disabled=true;close.disabled=true;drop.setAttribute('aria-disabled','true');login.hidden=true;
  try {
   const {data}=await supabase.auth.getSession();if(!data.session){login.hidden=false;throw new Error('Sign in first to keep your book private.');}
   status.textContent='Checking processing availability…';const health=await bookWorker({action:'health'});if(!health.available)throw new Error('Book processing is being connected. Please try again later.');
   const extraction=await extractFullBook(file,s=>status.textContent=s);const text=extraction.text;if(text.trim().length<100)throw new Error('Not enough readable text. Upload a searchable document, paper, or book.');
   status.textContent='Saving your private book…';
   const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
   const result=await bookWorker({action:'create',name:file.name,size:file.size,text,sha,extraction:{...extraction,text:undefined}});
   if(result.upload) {
    const {error}=await supabase.storage.from('private-books').uploadToSignedUrl(result.upload.path,result.upload.token,new Blob([file],{type:'application/octet-stream'}),{contentType:'application/octet-stream'});
    if(error)throw new Error('Source upload failed. Choose the same source file to retry.');
   }
   location.assign(`/your-book/?id=${encodeURIComponent(result.job.id)}`);
  }catch(error){status.textContent=error instanceof Error?error.message:'Upload failed. Please try again.';}
  finally{busy=false;submit.disabled=!valid;input.disabled=false;clear.disabled=false;close.disabled=false;drop.removeAttribute('aria-disabled');}
 });
}
