import {supabase} from './supabase';
import {readAdditions,additionsKey,sameBook,type BookAddition} from './book-intake';
import {bookStatus,bookSourceLabel,groupBookUploads} from './book-library-status.mjs';
const root=document.querySelector<HTMLElement>('[data-book-additions]')!;
const list=root.querySelector('[data-book-additions-list]')!;
const message=root.querySelector('[data-book-additions-message]')!;
let activeUserId:string|undefined, jobs:any[]=[], generation=0, refreshing=false, queued=false, signature='';
const linkFor=(id:string)=>`/your-book/?id=${encodeURIComponent(id)}`;
function render() {
 const additions=readAdditions(activeUserId);
 const next=JSON.stringify([activeUserId,jobs,additions]);
 if(next===signature)return;signature=next;
 const focused=document.activeElement instanceof HTMLAnchorElement&&list.contains(document.activeElement)?document.activeElement.getAttribute('href'):null;
 const expanded=new Set([...list.querySelectorAll<HTMLDetailsElement>('details[open]')].map(el=>el.dataset.bookId));
 list.replaceChildren();root.hidden=!jobs.length&&!additions.length;
 for(const {primary:job,copies} of groupBookUploads(jobs)) {
  const card=document.createElement('article');card.className='rounded-2xl border border-line bg-card p-4';
  const title=document.createElement('a');title.href=linkFor(job.id);title.className='font-serif text-xl';title.textContent=job.title;
  const scope=document.createElement('p');scope.className='mt-2 text-sm text-soft';scope.textContent=bookSourceLabel(job);
  const file=document.createElement('p');file.className='mt-1 break-words text-xs text-faint';file.textContent=job.source_name;
  const status=document.createElement('p');status.className='mt-3 text-sm text-soft';status.textContent=bookStatus(job);
  card.append(title,scope,file,status);
  if(copies.length) {
   const details=document.createElement('details');details.className='mt-3 text-sm';details.dataset.bookId=job.id;details.open=expanded.has(job.id);
   const summary=document.createElement('summary');summary.textContent=`${copies.length} other upload${copies.length===1?'':'s'} of the same text`;details.append(summary);
   for(const copy of copies) {
    const link=document.createElement('a');link.href=linkFor(copy.id);link.className='mt-2 block underline';link.textContent=`${copy.source_name} · ${bookStatus(copy)}`;details.append(link);
   }
   card.append(details);
  }
  list.append(card);
 }
 for(const addition of additions) {
  const card=document.createElement('article');card.className='rounded-2xl border border-line bg-card p-4';
  const title=document.createElement(addition.slug?'a':'h3');title.textContent=addition.title;title.className='font-serif text-xl text-ink';
  if(title instanceof HTMLAnchorElement)title.href=`/books/${encodeURIComponent(addition.slug!)}/`;
  const author=document.createElement('p');author.className='mt-1 text-sm text-soft';author.textContent=addition.author;
  const status=document.createElement('p');status.className='mt-3 text-xs text-faint';status.textContent=addition.slug?'Digest ready · Saved to your books':addition.status==='declined'?'Request reviewed':addition.status==='reviewing'?'Digest under review':'Digest requested';
  card.append(title,author,status);list.append(card);
 }
 if(focused)[...list.querySelectorAll<HTMLAnchorElement>('a')].find(a=>a.getAttribute('href')===focused)?.focus({preventScroll:true});
}
async function refresh() {
 if(refreshing){queued=true;return;}refreshing=true;const version=generation;
 try {
  const {data,error:authError}=await supabase.auth.getSession();if(authError)throw authError;
  if(version!==generation)return;
  const userId=data.session?.user.id;
  if(activeUserId!==userId){activeUserId=userId;jobs=[];render();}
  if(!userId){render();message.textContent='';return;}
  const [uploads,requests]=await Promise.all([
   supabase.from('book_processing_jobs').select('id,title,source_name,status,run_state,cursor,created_at,source_import,source_text_sha,source_line_count,total_sections,cover_status,cover_path,error,revision_kind').eq('user_id',userId).eq('is_current',true).order('created_at',{ascending:false}).limit(100),
   supabase.from('book_requests').select('id,title,author,status,created_at,external_id,matched_book_slug').eq('user_id',userId).order('created_at',{ascending:false}).limit(100),
  ]);
  if(version!==generation||userId!==activeUserId)return;
  if(uploads.error||requests.error)throw new Error('Could not refresh your books. We’ll try again shortly.');
  jobs=uploads.data||[];
  const remote:BookAddition[]=(requests.data||[]).map(row=>({id:row.id,title:row.title,author:row.author,status:row.status,createdAt:row.created_at,externalId:row.external_id,slug:row.matched_book_slug}));
  const local=readAdditions(userId).filter(item=>!remote.some(other=>sameBook(item,other)));
  try{localStorage.setItem(additionsKey(userId),JSON.stringify([...remote,...local].slice(0,100)));}catch{}
  message.textContent='';render();
 }catch {if(version===generation){root.hidden=false;message.textContent='Could not refresh your books. We’ll try again shortly.';}}
 finally{refreshing=false;if(queued){queued=false;void refresh();}}
}
window.addEventListener('awb:book-added',()=>void refresh());
window.addEventListener('focus',()=>void refresh());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
supabase.auth.onAuthStateChange((_event,session)=>{
 if(activeUserId===session?.user.id)return;
 generation++;activeUserId=session?.user.id;jobs=[];render();
 // Keep Supabase requests outside its synchronous auth callback.
 setTimeout(()=>void refresh(),0);
});
setInterval(()=>{if(!document.hidden)void refresh();},5000);
void refresh();
