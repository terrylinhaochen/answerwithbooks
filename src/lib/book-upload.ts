import {hashBookFile} from './book-file-hash';
import {supabase} from './supabase';
import limits from '../../supabase/functions/_shared/book-upload-limits.json';
export async function serviceCall(endpoint:string,body:Record<string,unknown>){
 const {data,error}=await supabase.functions.invoke(endpoint,{body});
 if(error){let message='Could not reach the service. Please try again.';try{message=(await error.context.json()).error||message;}catch{}throw Error(message);}if(data?.error)throw Error(data.error);return data;
}
// Kept for saved private books and historical receipts only.
export const bookWorker=(body:Record<string,unknown>)=>serviceCall('book-process',body);
export const nativeBookWorker=(body:Record<string,unknown>)=>serviceCall('book-native',body);
export type BookUploadContext={parentId?:string;revisionKind?:'append'|'replace'};
export function openBookUpload(_context:BookUploadContext={}){document.dispatchEvent(new CustomEvent('awb:open-book-upload'));}
export function mountBookUpload(){
 const dialog=document.querySelector<HTMLDialogElement>('#book-upload-dialog');if(!dialog)return;
 const form=dialog.querySelector('form')!,input=form.querySelector<HTMLInputElement>('[type=file]')!,submit=form.querySelector<HTMLButtonElement>('[type=submit]')!,status=form.querySelector('[data-upload-status]')!,list=form.querySelector('[data-upload-files]')!,login=form.querySelector<HTMLElement>('[data-upload-login]')!;
 let files:File[]=[],busy=false;
 const draw=()=>{list.replaceChildren();files.forEach(file=>{const row=document.createElement('li');row.textContent=file.name;list.append(row);});submit.disabled=busy||!files.length;};
 document.addEventListener('awb:open-book-upload',()=>dialog.showModal());
 document.querySelectorAll('[data-open-book-upload],[data-open-add-book],[data-open-book-request]').forEach(button=>button.addEventListener('click',()=>dialog.showModal()));
 dialog.querySelector('[data-close-book-upload]')!.addEventListener('click',()=>dialog.close());
 input.addEventListener('change',()=>{files=[...input.files||[]].slice(0,10);draw();});
 const drop=form.querySelector<HTMLElement>('[data-upload-drop]')!;drop.addEventListener('dragover',e=>e.preventDefault());drop.addEventListener('drop',e=>{e.preventDefault();if(!busy){files=[...e.dataTransfer?.files||[]].slice(0,10);draw();}});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;const {data}=await supabase.auth.getSession();if(!data.session){login.hidden=false;status.textContent='Sign in to add books to the shared library.';return;}
  busy=true;input.disabled=true;submit.disabled=true;login.hidden=true;
  try{
   const health=await nativeBookWorker({action:'health'});if(!health.available)throw Error('Book processing is temporarily unavailable. Please try again shortly.');
   for(const [index,file] of files.entries()){
    const row=list.children[index];
    try{
     if(!file.size||file.size>limits.maxFileBytes||! /\.(pdf|epub|docx|mobi|azw|azw3|html|htm|xhtml|rtf|txt|text|md|markdown|rst|adoc|asciidoc)$/i.test(file.name))throw Error(`Choose a supported book up to ${limits.maxFileBytes/1024/1024} MB.`);
     row.textContent=`${file.name} · Checking for an existing copy…`;
     const sha=await hashBookFile(file);
     const prepared=await nativeBookWorker({action:'prepare',name:file.name,size:file.size,sha,visibility:'public'});let id=prepared.job.id;
     if(!prepared.reused){row.textContent=`${file.name} · Uploading…`;const {error}=await supabase.storage.from('private-books').uploadToSignedUrl(prepared.upload.path,prepared.upload.token,file,{contentType:'application/octet-stream'});if(error)throw Error('Upload failed. Select this file again to retry.');const result=await nativeBookWorker({action:'finalize',id});id=result.job.id;}
     const link=document.createElement('a');link.href=`/books/read/?id=${encodeURIComponent(id)}`;link.textContent=prepared.reused?'Open existing book →':'View book progress →';row.replaceChildren(document.createTextNode(file.name+' · '),link);
    }catch(error){row.textContent=`${file.name} · ${error instanceof Error?error.message:'Please try again.'}`;}
   }
   status.textContent='Saved books continue processing in the background. You can close this dialog.';window.dispatchEvent(new Event('awb:book-added'));
  }catch(error){status.textContent=error instanceof Error?error.message:'Please try again.';}
  finally{busy=false;input.disabled=false;submit.disabled=false;}
 });
}
