import {sharedBookCard} from './shared-book-card';
import {sameBook} from './book-intake';
import {serviceCall,nativeBookWorker} from './book-upload';
import {bookJacketMarkup} from './book-jacket.mjs';
import {supabase} from './supabase';
const el=(tag:string,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;node.className=className;return node;};
export function mountSharedLibraries(){
 for(const root of document.querySelectorAll<HTMLElement>('[data-shared-library]')){
  const mine=root.dataset.mine==='true',list=root.querySelector('[data-shared-books]')!,status=root.querySelector('[data-shared-status]')!,more=root.querySelector<HTMLButtonElement>('[data-shared-more]')!;let offset=0,timer:ReturnType<typeof setTimeout>,closed=false;
  const refresh=async(append=false)=>{clearTimeout(timer);try{if(mine&&!(await supabase.auth.getSession()).data.session){root.hidden=true;return;}
   const result=await serviceCall('shared-library',{action:mine?'mine':'list',offset:append?offset:0});if(closed)return;if(!append)list.replaceChildren();root.hidden=!result.books.length&&!append;
   for(const [index,book] of result.books.entries()){
    const card=sharedBookCard(book,index);
    if(mine){const remove=el('button','Remove from your books','mt-3 text-sm underline');remove.addEventListener('click',async()=>{await serviceCall('shared-library',{action:'remove',id:book.id});await refresh();window.dispatchEvent(new Event('awb:book-added'));});card.querySelector('.library-copy')!.append(remove);}list.append(card);
   }
   offset=result.nextOffset||0;more.hidden=!result.nextOffset;status.textContent='';if(result.books.some((b:any)=>!['ready','failed'].includes(b.stage)))timer=setTimeout(()=>refresh(),8000);
  }catch(e){root.hidden=false;status.textContent=e instanceof Error?e.message:'Could not load books.';}};
  more.addEventListener('click',()=>refresh(true));window.addEventListener('awb:book-added',()=>refresh());window.addEventListener('pagehide',()=>{closed=true;clearTimeout(timer);});if(mine)supabase.auth.onAuthStateChange(()=>setTimeout(()=>refresh(),0));void refresh();
 }
}
export async function mountSharedBook(){
 const root=document.querySelector<HTMLElement>('[data-shared-book]')!;if(!root)return;const status=root.querySelector('[data-book-status]')!,content=root.querySelector<HTMLElement>('[data-book-body]')!,id=new URLSearchParams(location.search).get('id');let timer:ReturnType<typeof setTimeout>,closed=false;
 const refresh=async()=>{try{const {book}=await serviceCall('shared-library',{action:'get',id});if(closed)return;root.querySelector('[data-book-title]')!.textContent=book.title;root.querySelector('[data-book-author]')!.textContent=book.author;document.title=`${book.title} — Answer with Books`;root.querySelector('[data-book-cover]')!.innerHTML=bookJacketMarkup({title:book.title,author:book.author,color:book.coverColor,coverAsset:book.coverUrl});
  if(book.stage!=='ready'){status.textContent=book.stage==='failed'?'Processing stopped. Your file is saved.':'Reading this book and mapping its chapters. You can leave this page and come back.';content.hidden=true;if(book.stage!=='failed')timer=setTimeout(refresh,6000);else{const retry=el('button','Retry processing','awb-pill mt-4');retry.addEventListener('click',async()=>{try{await serviceCall('shared-library',{action:'retry',id:book.id});await refresh();}catch(e){status.textContent=e instanceof Error?e.message:'Please retry.';}});status.append(retry);}return;}
  status.textContent='';status.classList.remove('mt-8');content.hidden=false;
  root.querySelector<HTMLButtonElement>('[data-book-save]')!.disabled=false;
  for(const excerpt of root.querySelectorAll<HTMLButtonElement>('[data-shared-excerpt]')){excerpt.dataset.excerptBook=book.id;excerpt.dataset.excerptTitle=book.title;excerpt.dataset.excerptAuthor=book.author;excerpt.dataset.excerptCover=book.coverUrl||'';excerpt.dataset.excerptColor=book.coverColor||'';excerpt.disabled=false;}
  root.querySelector<HTMLElement>('[data-job-overview]')!.hidden=false;
  root.querySelector('[data-job-one-liner]')!.textContent=book.orientation;
  root.querySelector('[data-job-purchase-title]')!.textContent=book.title;
  root.querySelector('[data-job-purchase-author]')!.textContent=`by ${book.author}`;
  const purchase=root.querySelector<HTMLAnchorElement>('[data-job-amazon]')!;
  purchase.href='https://www.amazon.com/s?k='+encodeURIComponent(`${book.title} ${book.author}`);
  purchase.setAttribute('aria-label',`Find ${book.title} on Amazon (opens in a new tab)`);
  root.querySelector('[data-book-summary]')!.replaceChildren(...book.summary.split(/\n\n+/).filter(Boolean).map((block:string)=>/^## /.test(block)?el('h2',block.slice(3).trim()):el('p',block)));
  const words=[book.orientation,book.summary].join(' ').trim().split(/\s+/).filter(Boolean).length;
  root.querySelector('[data-book-meta]')!.textContent=`Book digest · ${words.toLocaleString()} words · ${Math.max(1,Math.ceil(words/200))} min`;
  const feedback=root.querySelector<HTMLElement>('[data-content-feedback]')!;feedback.dataset.contentSlug=book.id;feedback.dataset.contentTitle=book.title;
  const questions=root.querySelector('[data-book-questions]')!,template=root.querySelector<HTMLTemplateElement>('[data-book-question-template]')!;questions.replaceChildren();
  for(const q of book.questions.slice(0,3)){
   const item=template.content.firstElementChild!.cloneNode(true) as HTMLElement;
   item.querySelector('[data-question-title]')!.textContent=q.question;
   item.querySelector('[data-question-context]')!.textContent=q.contribution;
   item.querySelector('[data-explore-question]')!.addEventListener('click',()=>document.dispatchEvent(new CustomEvent('awb:find-excerpt',{detail:{id:book.id,title:book.title,author:book.author,coverUrl:book.coverUrl,coverColor:book.coverColor,question:q.question}})));
   questions.append(item);
  }
  if(book.coverUrl==null)timer=setTimeout(refresh,15000);
 }catch(e){status.textContent=e instanceof Error?e.message:'Could not open this book.';}};
 root.querySelector('[data-book-save]')!.addEventListener('click',async()=>{try{await serviceCall('shared-library',{action:'save',id});status.textContent='Saved to your books.';}catch(e){status.textContent=e instanceof Error?e.message:'Sign in to save this book.';}});window.addEventListener('pagehide',()=>{closed=true;clearTimeout(timer);});await refresh();
}

const CATALOG_CACHE='awb:shared-catalog:v1',CATALOG_TTL=24*60*60*1000;
const readCatalogCache=():any[]|null=>{try{const cached=JSON.parse(localStorage.getItem(CATALOG_CACHE)||'null');return cached&&Array.isArray(cached.books)&&Date.now()-cached.savedAt<CATALOG_TTL?cached.books:null;}catch{return null;}};
// Signed cover URLs expire, so the cache keeps everything except them.
const writeCatalogCache=(books:any[])=>{try{localStorage.setItem(CATALOG_CACHE,JSON.stringify({savedAt:Date.now(),books:books.map(({coverUrl,...book})=>book)}));}catch{}};
export function uploadProgressLabel(book:any){
 if(book.stage==='failed')return 'Processing needs attention';
 if(book.stage==='extracting')return 'Reading the file…';
 const {completed=0,total=0}=book.progress||{};return total?`Mapping chapters · ${Math.min(completed,total)} of ${total}`:'Mapping chapters…';
}
export function mountSharedCatalog(){
 const list=document.querySelector<HTMLElement>('[data-filter-list]');if(!list)return;
 const status=document.querySelector<HTMLElement>('[data-catalog-status]');let refreshing=false,queued=false,closed=false,lastRefresh=0,uploadTimer:ReturnType<typeof setTimeout>|undefined;
 const anchor=()=>list!.querySelector('[data-book-request-card]');
 const insertTop=(fragment:DocumentFragment)=>{const upload=anchor();if(upload)upload.after(fragment);else list!.prepend(fragment);};
 function drawCatalog(books:any[]){
  list!.querySelectorAll('[data-shared-catalog-item]').forEach(item=>item.remove());
  const fragment=document.createDocumentFragment();
  for(const [index,book] of books.entries()){
   // A full uploaded edition replaces a matching static card in this view.
   for(const item of list!.querySelectorAll<HTMLElement>('[data-catalog-title]'))if(sameBook({title:item.dataset.catalogTitle!,author:item.dataset.catalogAuthor!},book))item.remove();
   const item=el('div','','h-full');item.dataset.filterItem='';item.dataset.sharedCatalogItem=book.id;item.dataset.categories='[]';
   item.dataset.search=[book.title,book.author,book.orientation,...(book.questions||[]).map((q:any)=>q.question)].join(' ').toLowerCase();
   item.append(sharedBookCard(book,index,false));fragment.append(item);
  }
  // Uploads in progress stay pinned above the catalog.
  const pinned=list!.querySelectorAll('[data-shared-upload-item]');const last=pinned[pinned.length-1];
  if(last)last.after(fragment);else insertTop(fragment);
  window.dispatchEvent(new Event('awb:catalog-updated'));
 }
 async function refresh(){
  if(refreshing){queued=true;return;}refreshing=true;lastRefresh=Date.now();
  try{
   const books:any[]=[];let offset=0;
   // Draw each page as it arrives instead of waiting for the whole library.
   do{const result=await serviceCall('shared-library',{action:'list',offset,compact:true});if(closed)return;books.push(...result.books);drawCatalog(books);offset=result.nextOffset;}while(offset&&!closed);
   writeCatalogCache(books);if(status)status.textContent='';
  }catch{if(status)status.textContent='Newly added books could not load. Please refresh to try again.';}
  finally{refreshing=false;if(queued&&!closed){queued=false;void refresh();}}
 }
 async function refreshUploads(){
  clearTimeout(uploadTimer);
  let books:any[]=[];
  try{if((await supabase.auth.getSession()).data.session)({books}=await serviceCall('shared-library',{action:'uploads'}));}catch{return;}
  if(closed)return;
  const previous=new Set([...list!.querySelectorAll<HTMLElement>('[data-shared-upload-item]')].map(item=>item.dataset.sharedUploadItem));
  list!.querySelectorAll('[data-shared-upload-item]').forEach(item=>item.remove());
  const fragment=document.createDocumentFragment();
  for(const [index,book] of books.entries()){
   const item=el('div','','h-full');item.dataset.filterItem='';item.dataset.sharedUploadItem=book.id;item.dataset.categories='[]';item.dataset.search=[book.title,book.author].join(' ').toLowerCase();
   const card=sharedBookCard(book,index,false);card.classList.add('library-book-processing');card.dataset.stage=book.stage;
   card.querySelector('.room-eyebrow')!.textContent=book.stage==='failed'?'Your upload':'Processing your upload';
   const note=card.querySelector('.library-copy > p.text-soft');if(note)note.textContent=uploadProgressLabel(book);
   item.append(card);fragment.append(item);
  }
  insertTop(fragment);window.dispatchEvent(new Event('awb:catalog-updated'));
  // A book that left the processing list has finished: show it in the catalog.
  if([...previous].some(id=>!books.some(book=>book.id===id)))void refresh();
  if(books.some(book=>book.stage!=='failed'))uploadTimer=setTimeout(()=>void refreshUploads(),8000);
 }
 const cached=readCatalogCache();if(cached)drawCatalog(cached);
 window.addEventListener('awb:book-added',()=>{void refreshUploads();void refresh();});
 window.addEventListener('focus',()=>{void refreshUploads();if(Date.now()-lastRefresh>60000)void refresh();});
 window.addEventListener('pagehide',()=>{closed=true;clearTimeout(uploadTimer);});
 supabase.auth.onAuthStateChange(()=>setTimeout(()=>void refreshUploads(),0));
 void refreshUploads();void refresh();
}
