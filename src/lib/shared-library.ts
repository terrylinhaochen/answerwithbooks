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

export function mountSharedCatalog(){
 const list=document.querySelector<HTMLElement>('[data-filter-list]');if(!list)return;
 const status=document.querySelector<HTMLElement>('[data-catalog-status]');let refreshing=false,queued=false,closed=false;
 async function refresh(){
  if(refreshing){queued=true;return;}refreshing=true;
  try{
   const books:any[]=[];let offset=0;
   do{const result=await serviceCall('shared-library',{action:'list',offset});books.push(...result.books);offset=result.nextOffset;}while(offset&&!closed);
   if(closed)return;
   list!.querySelectorAll('[data-shared-catalog-item]').forEach(item=>item.remove());
   const fragment=document.createDocumentFragment();
   for(const [index,book] of books.entries()){
    // A full uploaded edition replaces a matching static card in this view.
    for(const item of list!.querySelectorAll<HTMLElement>('[data-catalog-title]'))if(sameBook({title:item.dataset.catalogTitle!,author:item.dataset.catalogAuthor!},book))item.remove();
    const item=el('div','','h-full');item.dataset.filterItem='';item.dataset.sharedCatalogItem=book.id;item.dataset.categories='[]';
    item.dataset.search=[book.title,book.author,book.orientation,...(book.questions||[]).map((q:any)=>q.question)].join(' ').toLowerCase();
    item.append(sharedBookCard(book,index,false));fragment.append(item);
   }
   const upload=list!.querySelector('[data-book-request-card]');if(upload)upload.after(fragment);else list!.prepend(fragment);
   if(status)status.textContent='';window.dispatchEvent(new Event('awb:catalog-updated'));
  }catch{if(status)status.textContent='Newly added books could not load. Please refresh to try again.';}
  finally{refreshing=false;if(queued&&!closed){queued=false;void refresh();}}
 }
 window.addEventListener('awb:book-added',()=>void refresh());
 window.addEventListener('focus',()=>void refresh());
 window.addEventListener('pagehide',()=>{closed=true;});
 void refresh();
}
