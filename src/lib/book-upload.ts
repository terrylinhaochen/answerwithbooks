import { supabase } from './supabase';
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
 if(file.size===0||file.size>10*1024*1024)throw new Error('Choose a non-empty book under 10 MB.');
 if(!/\.(pdf|txt|md)$/i.test(file.name))throw new Error('Choose a PDF, TXT, or Markdown book. Cover images are not book sources.');
 if(!/\.pdf$/i.test(file.name)) { const text=await file.text();if(text.includes('\0'))throw new Error('Choose a plain-text file.');return text; }
 const [pdfjs,{default:workerSrc}]=await Promise.all([import('pdfjs-dist'),import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
 pdfjs.GlobalWorkerOptions.workerSrc=workerSrc;
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,enableXfa:false});
 task.onPassword=()=>{void task.destroy();};
 try {
  const pdf=await task.promise;if(pdf.numPages>1500)throw new Error('This PDF is too long for the current upload limit.');
  let text='';
  for(let n=1;n<=pdf.numPages;n++) {
   progress(`Reading page ${n} of ${pdf.numPages}…`);
   const page=await pdf.getPage(n);const content=await page.getTextContent();
   const value=content.items.map(item=>'str' in item?item.str+(item.hasEOL?'\n':' '):'').join('');
   if(value.trim().length<20 && n>2 && n<pdf.numPages-1) throw new Error('This PDF contains pages without readable text. Run OCR first, then upload the searchable PDF.');
   text+=`\n[Page ${n}]\n${value}\n`;page.cleanup();
   if(text.length>1200000)throw new Error('This book exceeds the current text limit.');
  }return text;
 }finally{await task.destroy();}
}
export function mountBookUpload() {
 const dialog=document.querySelector<HTMLDialogElement>('#book-upload-dialog');if(!dialog)return;
 const form=dialog.querySelector<HTMLFormElement>('form')!;
 const input=dialog.querySelector<HTMLInputElement>('input[type=file]')!;
 const submit=dialog.querySelector<HTMLButtonElement>('[data-upload-submit]')!;
 const status=dialog.querySelector<HTMLElement>('[data-upload-status]')!;
 const login=dialog.querySelector<HTMLAnchorElement>('[data-upload-login]')!;
 document.querySelectorAll('[data-open-book-request]').forEach(button=>button.addEventListener('click',()=>{dialog.showModal();input.focus();}));
 dialog.querySelector('[data-close-book-upload]')?.addEventListener('click',()=>dialog.close());
 let busy=false;
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const file=input.files?.[0];if(!file){status.textContent='Choose a book first.';return;}
  busy=true;submit.disabled=true;input.disabled=true;login.hidden=true;
  try {
   const {data}=await supabase.auth.getSession();if(!data.session){login.hidden=false;throw new Error('Sign in first to keep your book private.');}
   status.textContent='Checking processing availability…';const health=await bookWorker({action:'health'});if(!health.available)throw new Error('Book processing is being connected. Please try again later.');
   const text=await extractFullBook(file,s=>status.textContent=s);if(text.trim().length<100)throw new Error('Not enough readable text. Upload a searchable book source.');
   status.textContent='Saving your private book…';
   const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
   const result=await bookWorker({action:'create',name:file.name,text,sha});
   if(result.upload) {
    const {error}=await supabase.storage.from('private-books').uploadToSignedUrl(result.upload.path,result.upload.token,file,{contentType:/\.pdf$/i.test(file.name)?'application/pdf':'text/plain'});
    if(error)throw new Error('Source upload failed. Choose the same book to retry.');
   }
   location.assign(`/your-book/?id=${encodeURIComponent(result.job.id)}`);
  }catch(error){status.textContent=error instanceof Error?error.message:'Upload failed. Please try again.';}
  finally{busy=false;submit.disabled=false;input.disabled=false;}
 });
}
