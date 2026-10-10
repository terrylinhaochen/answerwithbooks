import {bookJacketMarkup} from './book-jacket.mjs';
import {coverPalette} from '../../supabase/functions/_shared/book-cover-design.mjs';
import {supabase} from './supabase';
import {readAdditions,additionsKey,sameBook,type BookAddition} from './book-intake';
import {bookStatus,bookSourceLabel,groupBookUploads} from './book-library-status.mjs';
const root=document.querySelector<HTMLElement>('[data-book-additions]')!;
const list=root.querySelector('[data-book-additions-list]')!;
const message=root.querySelector('[data-book-additions-message]')!;
let activeUserId:string|undefined, jobs:any[]=[], generation=0, refreshing=false, queued=false, signature='';
const covers=new Map<string,{url:string;expires:number}>();
const linkFor=(id:string)=>`/your-book/?id=${encodeURIComponent(id)}`;
function render() {
 const additions=readAdditions(activeUserId);
 const next=JSON.stringify([activeUserId,jobs,additions,[...covers].map(([path,entry])=>[path,entry.url])]);
 if(next===signature)return;signature=next;
 const focused=document.activeElement instanceof HTMLAnchorElement&&list.contains(document.activeElement)?document.activeElement.getAttribute('href'):null;
 const expanded=new Set([...list.querySelectorAll<HTMLDetailsElement>('details[open]')].map(el=>el.dataset.bookId));
 list.replaceChildren();root.hidden=!jobs.length&&!additions.length;
 for(const {primary:job,copies} of groupBookUploads(jobs)) {
  const card=document.createElement('article');card.className='library-book';
  const layout=document.createElement('div');layout.className='library-book__layout';
  const cover=document.createElement('a');cover.href=linkFor(job.id);cover.className='library-cover';cover.style.setProperty('--book-well',['#e2e3d6','#e9e0d2','#e0e4df'][list.children.length%3]);cover.setAttribute('aria-label',`Open ${job.title}`);
  const jacket=document.createElement('span');jacket.className='library-jacket';
  jacket.innerHTML=bookJacketMarkup({title:job.title,author:job.author||'',color:coverPalette(job).bg,coverAsset:covers.get(job.cover_path)?.url});
  jacket.querySelector('img')?.addEventListener('error',event=>(event.target as HTMLImageElement).remove(),{once:true});
  cover.append(jacket);const arrow=document.createElement('span');arrow.className='library-open';arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';cover.append(arrow);
  const body=document.createElement('div');body.className='library-copy';
  const scope=document.createElement('p');scope.className='room-eyebrow';
  const sourceScope=bookSourceLabel(job).split(' · ');scope.textContent=sourceScope[0]==='Excerpt'?`Private excerpt · ${sourceScope[1]}`:'Private book';
  const heading=document.createElement('h3');heading.className='font-serif';
  const title=document.createElement('a');title.href=linkFor(job.id);title.className='inline-flex min-h-8 items-center hover:text-soft';title.textContent=job.title;heading.append(title);
  const author=document.createElement('p');author.className='library-author';author.textContent=job.author&&job.author!=='Unknown author'?job.author:'Author not identified';
  const summary=document.createElement('p');summary.className='library-description';summary.textContent=job.skill_summary?.one_liner||job.skill_summary?.read_if||(job.status==='ready'?'Your book summary and reusable skill are ready to open.':'Your summary will appear when processing finishes.');
  body.append(scope,heading,author,summary);
  if(job.status!=='ready'){const status=document.createElement('p');status.className='mt-3 text-sm text-soft';status.textContent=bookStatus(job);body.append(status);}
  const details=document.createElement('details');details.className='book-library-card__details';details.dataset.bookId=job.id;details.open=expanded.has(job.id);
  const detailTitle=document.createElement('summary');detailTitle.textContent='Source details'+(copies.length?` · ${copies.length} other upload${copies.length===1?'':'s'}`:'');details.append(detailTitle);
  for(const text of [bookSourceLabel(job),job.source_name,bookStatus(job)]){const p=document.createElement('p');p.className='mt-2';p.textContent=text;details.append(p);}
  for(const copy of copies){const link=document.createElement('a');link.href=linkFor(copy.id);link.className='mt-2 block underline';link.textContent=`${copy.source_name} · ${bookStatus(copy)}`;details.append(link);}
  body.append(details);layout.append(cover,body);card.append(layout);
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
  if(activeUserId!==userId){activeUserId=userId;jobs=[];covers.clear();render();}
  if(!userId){render();message.textContent='';return;}
  const [uploads,requests]=await Promise.all([
   supabase.from('book_processing_jobs').select('id,title,author,skill_summary,source_name,status,run_state,cursor,created_at,source_import,source_text_sha,source_line_count,total_sections,cover_status,cover_path,error,revision_kind').eq('user_id',userId).eq('is_current',true).order('created_at',{ascending:false}).limit(100),
   supabase.from('book_requests').select('id,title,author,status,created_at,external_id,matched_book_slug').eq('user_id',userId).order('created_at',{ascending:false}).limit(100),
  ]);
  if(version!==generation||userId!==activeUserId)return;
  if(uploads.error||requests.error)throw new Error('Could not refresh your books. We’ll try again shortly.');
  const uploaded=uploads.data||[];
  const paths=[...new Set(uploaded.filter(job=>job.cover_status==='ready'&&job.cover_path).map(job=>job.cover_path))];
  const missing=paths.filter(path=>!covers.has(path)||covers.get(path)!.expires<Date.now());
  if(missing.length){
   const signed=await supabase.storage.from('private-books').createSignedUrls(missing,3600);
   if(version!==generation||userId!==activeUserId)return;
   for(const item of signed.data||[])if(item.path&&item.signedUrl&&!item.error)covers.set(item.path,{url:item.signedUrl,expires:Date.now()+3000000});
  }
  jobs=uploaded;
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
 generation++;activeUserId=session?.user.id;jobs=[];covers.clear();render();
 // Keep Supabase requests outside its synchronous auth callback.
 setTimeout(()=>void refresh(),0);
});
setInterval(()=>{if(!document.hidden)void refresh();},5000);
void refresh();
