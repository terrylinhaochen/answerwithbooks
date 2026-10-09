import {bookStatus,bookSourceLabel} from './book-library-status.mjs';
import {supabase} from './supabase';
import {bookWorker,nativeBookWorker} from './book-upload';
const root=document.querySelector('[data-book-queue]')!;
const list=root.querySelector('[data-queue-list]')!;
const message=root.querySelector('[data-queue-message]')!;
let updating=false;
async function refresh(){
 if(updating)return;updating=true;
 try{
  const {data}=await supabase.auth.getSession();if(!data.session)throw new Error('Sign in to view your private processing queue.');
  const {data:jobs,error}=await supabase.from('book_processing_jobs').select('id,title,source_name,status,run_state,cursor,error,created_at,source_import,is_current,revision,total_sections,source_line_count,cover_status,cover_path').order('created_at',{ascending:false}).limit(100);
  if(error)throw new Error('Could not load your queue. Refresh to try again.');
  list.replaceChildren();message.textContent=jobs?.length?'Up to two of your sources process at once.':'No uploaded sources yet.';
  for(const job of jobs||[]){
   const card=document.createElement('article');card.className='rounded-2xl border border-line bg-card p-5';
   const title=document.createElement('a');title.className='font-serif text-2xl underline decoration-1 underline-offset-4';title.textContent=job.title;title.href=`/your-book/?id=${job.id}`;
   const progress=document.createElement('p');progress.className='mt-3 text-sm text-soft';
   progress.textContent=bookStatus(job);
   const source=document.createElement('p');source.className='mt-2 text-sm text-soft';source.textContent=`${bookSourceLabel(job)} · ${job.source_name}`;
   card.append(title,source,progress);
   if(!['ready','analyzed'].includes(job.status)&&job.run_state!=='staging'){
    const button=document.createElement('button');button.className='awb-pill mt-4';const pause=job.run_state==='queued';button.textContent=pause?'Pause':'Resume';button.addEventListener('click',async()=>{
     button.disabled=true;
     try{const call=job.source_import?.kind==='native'&&job.source_import.state==='failed'?nativeBookWorker:bookWorker;await call({action:pause?'pause':'retry',id:job.id});void refresh();}catch(e){message.textContent=e instanceof Error?e.message:'Please retry.';button.disabled=false;}
    });card.append(button);
   }
   list.append(card);
  }
 }catch(e){message.textContent=e instanceof Error?e.message:'Could not load your queue.';}
 finally{updating=false;}
}
void refresh();setInterval(()=>{if(!document.hidden&&!root.contains(document.activeElement))void refresh();},5000);
