import { supabase } from './supabase';
import { mountShelfSharing } from './shelf-sharing';
import type { User } from '@supabase/supabase-js';

type CatalogBook = { slug: string; title: string; author: string };
const preferenceKey = 'answer_with_books_shelf';
export function mountShelfPersonalizer({lab, defaults, catalog, applySelection}: {
 lab: HTMLElement; defaults: string[]; catalog: CatalogBook[]; applySelection: (ids: string[]) => void;
}) {
 const dialog=lab.querySelector<HTMLDialogElement>('#shelf-personalizer')!;
 const open=lab.querySelector<HTMLButtonElement>('[data-personalize-shelf]')!;
 const close=dialog.querySelector<HTMLButtonElement>('[data-close-shelf-picker]')!;
 const form=dialog.querySelector<HTMLFormElement>('[data-shelf-preferences]')!;
 const signin=dialog.querySelector<HTMLElement>('[data-shelf-signin]')!;
 const loading=dialog.querySelector<HTMLElement>('[data-shelf-account-loading]')!;
 const search=dialog.querySelector<HTMLInputElement>('[data-shelf-search]')!;
 const selected=dialog.querySelector<HTMLElement>('[data-shelf-selected]')!;
 const status=dialog.querySelector<HTMLElement>('[data-shelf-picker-status]')!;
 const save=dialog.querySelector<HTMLButtonElement>('[data-save-shelf]')!;
 const reset=dialog.querySelector<HTMLButtonElement>('[data-shelf-defaults]')!;
 const clear=dialog.querySelector<HTMLButtonElement>('[data-clear-shelf]')!;
 const clearSearch=dialog.querySelector<HTMLButtonElement>('[data-clear-shelf-search]')!;
 const share=lab.querySelector<HTMLButtonElement>('[data-share-shelf]')!;
 const shareDraft=dialog.querySelector<HTMLButtonElement>('[data-share-shelf-selection]')!;
 const sharing=mountShelfSharing(lab,catalog,slug=>lab.querySelector<HTMLTemplateElement>(`[data-shelf-cover="${slug}"]`)?.content.cloneNode(true));
 const options=Array.from(dialog.querySelectorAll<HTMLElement>('[data-shelf-option]'));
 const bySlug=new Map(catalog.map(book=>[book.slug,book]));
 const publicHeading=lab.querySelector<HTMLElement>('[data-public-shelf-heading]')!;
 const personalHeading=lab.querySelector<HTMLElement>('[data-personal-shelf-heading]')!;
 const description=lab.querySelector<HTMLElement>('[data-shelf-description]')!;
 const defaultDescription=description.cloneNode(true) as HTMLElement;
 const shelfDate=lab.querySelector<HTMLTimeElement>('[data-shelf-date]')!;
 let dateTimer=0;
 function updateDate(){
  window.clearTimeout(dateTimer);
  const now=new Date();
  shelfDate.dateTime=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  shelfDate.textContent=new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(now);
  const midnight=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
  dateTimer=window.setTimeout(updateDate,midnight.getTime()-now.getTime()+1000);
 }
 updateDate();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateDate();});

 function personalizeHeading(user: User|null, hasSelection: boolean){
  publicHeading.hidden=!!user;personalHeading.hidden=!user;shelfDate.hidden=!user;
  lab.querySelector('[data-shelf-eyebrow]')!.textContent=user?'YOUR BOOK & SKILL LIBRARY':'THE BOOK & SKILL LIBRARY';
  lab.querySelector('[data-personalize-label]')!.textContent=user&&hasSelection?'Edit shelf':'Personalize';
  if(!user){description.replaceChildren(...Array.from(defaultDescription.cloneNode(true).childNodes));lab.querySelector('[data-shelf-owner]')!.textContent='Your';return;}
  const metadata=user.user_metadata;
  const profileName=[metadata?.first_name,metadata?.full_name,metadata?.name].find(value=>typeof value==='string'&&value.trim());
  const emailName=user.email?.split('@')[0].split(/[._+\-]/)[0];
  const raw=profileName?.trim().split(/\s+/)[0] || (emailName&&/^[\p{L}]{2,24}$/u.test(emailName)?emailName:'');
  const name=raw?raw.charAt(0).toLocaleUpperCase()+raw.slice(1):'';
  lab.querySelector('[data-shelf-owner]')!.textContent=name?`${name}’s`:'Your';
  description.textContent=hasSelection?'Your collection, ready for your next question or task.':'Start with these five books. Personalize your shelf with the ones that matter to you.';
 }

 let userId: string|null=null;
 let saved=[...defaults];let draft=[...defaults];let ready=false;let busy=false;let authRevision=0;
 let previousOverflow='';
 let requested=new URLSearchParams(location.search).get('personalize')==='1';
 const validIds=(value: unknown): value is string[]=>Array.isArray(value)&&value.length===5&&new Set(value).size===5&&value.every(id=>typeof id==='string'&&bySlug.has(id));
 function filter(){
  let visible=0;const query=search.value.trim().toLocaleLowerCase();
  clearSearch.hidden=!search.value;
  options.forEach(option=>{option.hidden=!option.dataset.search!.includes(query);if(!option.hidden)visible++;});
  dialog.querySelector<HTMLElement>('[data-shelf-empty]')!.hidden=visible>0;
 }
 function render(){
  loading.hidden=ready;signin.hidden=!ready||!!userId;form.hidden=!ready||!userId;
  save.disabled=busy||draft.length!==5;save.textContent=busy?'Saving…':'Save my shelf';close.disabled=busy;reset.disabled=busy;search.disabled=busy;
  clear.disabled=busy||draft.length===0;clearSearch.disabled=busy;share.disabled=!ready||busy;shareDraft.disabled=busy||draft.length===0;
  dialog.querySelector('[data-shelf-count]')!.textContent=`${draft.length} of 5 selected`;
  options.forEach(option=>{const input=option.querySelector<HTMLInputElement>('input')!;input.checked=draft.includes(input.value);input.disabled=busy||(!input.checked&&draft.length>=5);});
  selected.replaceChildren(...draft.map(id=>{
   const button=document.createElement('button');button.type='button';button.disabled=busy;button.textContent=bySlug.get(id)!.title+' ×';button.setAttribute('aria-label',`Remove ${bySlug.get(id)!.title}`);
   button.addEventListener('click',()=>{draft=draft.filter(value=>value!==id);status.textContent='';render();search.focus({preventScroll:true});});return button;
  }));
  filter();
 }
 function show(){draft=[...saved];search.value='';status.textContent='';render();if(!dialog.open){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();}if(userId)search.focus();}
 function syncUser(user: User|null){
  const wasReady=ready;const changed=userId!==(user?.id||null);userId=user?.id||null;ready=true;
  if(changed){sharing.close();busy=false;if(dialog.open&&wasReady)dialog.close();search.value='';status.textContent='';}
  const value=user?.user_metadata?.[preferenceKey];
  const hasSelection=value?.version===1&&validIds(value.books);
  const ids=hasSelection?value.books:defaults;
  personalizeHeading(user,hasSelection);
  saved=[...ids];
  if(!busy){applySelection(saved);if(!dialog.open)draft=[...saved];}
  render();
  if(requested){requested=false;const url=new URL(location.href);url.searchParams.delete('personalize');history.replaceState(null,'',url);show();}
 }
 open.addEventListener('click',show);
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;open.focus({preventScroll:true});});
 search.addEventListener('input',filter);
 clearSearch.addEventListener('click',()=>{search.value='';filter();search.focus();});
 clear.addEventListener('click',()=>{draft=[];search.value='';status.textContent='';render();search.focus();});
 const shareContext=()=>({title:personalHeading.hidden?'Your shelf':personalHeading.textContent!.trim().replace(/\s+/g,' '),date:shelfDate.textContent||undefined});
 share.addEventListener('click',()=>sharing.open(saved,share,shareContext()));
 shareDraft.addEventListener('click',()=>sharing.open(draft,shareDraft,shareContext()));
 reset.addEventListener('click',()=>{draft=[...defaults];status.textContent='';render();});
 options.forEach(option=>option.querySelector<HTMLInputElement>('input')!.addEventListener('change',event=>{
  const input=event.target as HTMLInputElement;
  draft=input.checked?[...draft,input.value]:draft.filter(id=>id!==input.value);status.textContent='';render();
 }));
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!userId||!validIds(draft))return;
  const owner=userId;const ids=[...draft];busy=true;status.textContent='';render();
  try {
   const {data,error}=await supabase.auth.updateUser({data:{[preferenceKey]:{version:1,books:ids}}});
   if(owner!==userId)return;
   if(error||data.user?.id!==owner)throw new Error('Save failed');
   const returned=data.user.user_metadata?.[preferenceKey];
   if(returned?.version!==1||!validIds(returned.books)||returned.books.some((id:string,i:number)=>id!==ids[i]))throw new Error('Save not confirmed');
   saved=ids;personalizeHeading(data.user,true);applySelection(ids);dialog.close();
  } catch {if(owner===userId)status.textContent='We couldn’t save your shelf. Your previous collection is unchanged. Please try again.';}
  finally {if(owner===userId){busy=false;render();}}
 });
 // Auth callbacks stay synchronous to avoid locking Supabase's auth client.
 supabase.auth.onAuthStateChange((_event,session)=>{authRevision++;window.setTimeout(()=>syncUser(session?.user||null),0);});
 void (async()=>{
  const {data,error}=await supabase.auth.getSession();if(error){syncUser(null);return;}
  if(!data.session){syncUser(null);return;}
  const revision=authRevision;const result=await supabase.auth.getUser();
  if(revision===authRevision)syncUser(result.error?data.session.user:result.data.user);
 })().catch(()=>syncUser(null));
}
