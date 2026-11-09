import {formatOriginalText} from '../../supabase/functions/_shared/reading-format.mjs';
import {saveGuideDraft,readGuideDraft,clearGuideDraft,guideAuthPaths} from './guide-draft.mjs';
import {printGuideMarkup} from './print-study.mjs';
import {generatedGuideCoverMarkup} from './generated-guide-cover.mjs';
import {buildOriginalGuideReadingPrompt} from './reading-handoff';
import {serviceCall} from './book-upload';
import {supabase} from './supabase';
import {bookJacketMarkup} from './book-jacket.mjs';
export async function guideCall(body:Record<string,unknown>){
 const {data,error}=await supabase.functions.invoke('reading-guides',{body});
 if(error){let payload:any={};try{payload=await error.context.json();}catch{}throw Object.assign(Error(payload.error||'The reading service could not be reached. Please try again.'),{code:payload.code,status:error.context?.status});}if(data?.error)throw Object.assign(Error(data.error),{code:data.code});return data;
}
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;};
// Fixed catalog reset, midnight November 6 in the product owner's timezone.
// Earlier readings remain accessible by their saved links.
const catalogStart=Date.parse('2026-11-06T00:00:00-08:00');
const inCurrentCatalog=(guide:{created_at?:string})=>Date.parse(guide.created_at||'')>=catalogStart;
type GuideBook={id:string;title:string;author?:string;visibility?:string;coverUrl?:string|null;coverColor?:string;archived?:boolean};
function bookCover(book:GuideBook){
 const jacket=el('span','','reading-book-cover');jacket.setAttribute('aria-hidden','true');
 jacket.innerHTML=bookJacketMarkup({title:book.title,author:book.author||'',color:book.coverColor||'#cbbd96',coverAsset:book.coverUrl});
 jacket.querySelector('img')?.addEventListener('error',event=>(event.currentTarget as HTMLImageElement).remove());
 return jacket;
}
function bookCard(book:GuideBook){const card=el('li','','reading-book-card'),copy=el('div');copy.append(el('strong',book.title),el('small',book.author||''));card.append(bookCover(book),copy);return card;}
type GuideCover={src?:string|null;label?:string;topic?:string;background?:string;version?:string;status?:string};
function guideCover(_question:string,design:GuideCover={}){
 const study=design.src?(generatedGuideCoverMarkup(_question,design)||printGuideMarkup(_question)):null;
 if(study){const holder=document.createElement('div');holder.innerHTML=study;return holder.firstElementChild as HTMLDivElement;}
 const cover=el('div','','reading-guide-cover');cover.setAttribute('aria-hidden','true');
 if(!design.src){cover.classList.add('reading-guide-cover-pending');cover.append(el('small',design.status==='failed'?'Your reading is ready':'Illustrating your cover'));return cover;}
 if(/^#[a-f0-9]{6}$/i.test(design.background||''))cover.style.backgroundColor=design.background!;
 const art=el('img');art.src=design.src;art.alt='';art.loading='lazy';art.className='reading-guide-cover-image';
 art.addEventListener('error',()=>{cover.replaceChildren();cover.classList.add('reading-guide-cover-pending');});
 const label=el('div','','reading-guide-cover-label');label.append(el('small',design.topic||'Reading'),el('span',design.label||'Your guide'));
 cover.append(art,label);return cover;
}
export async function mountGuides(){
 const root=document.querySelector<HTMLElement>('[data-guide-composer]');if(!root)return;
 const modalOnly=root.dataset.modalOnly==='true',dialog=root.querySelector<HTMLDialogElement>('[data-guide-dialog]')!;
 const form=root.querySelector<HTMLFormElement>('[data-guide-question]')!,question=form.querySelector<HTMLTextAreaElement>('textarea')!;
 const launcher=root.querySelector<HTMLFormElement>('[data-guide-launcher]'),launchQuestion=launcher?.querySelector<HTMLTextAreaElement>('textarea');
 const status=root.querySelector<HTMLElement>('[data-guide-status]')!,proposal=root.querySelector<HTMLElement>('[data-guide-proposal]')!,confirm=root.querySelector<HTMLButtonElement>('[data-confirm-guide]')!;
 const submit=form.querySelector<HTMLButtonElement>('[type=submit]')!,login=root.querySelector<HTMLAnchorElement>('[data-guide-login]')!;
 const processing=root.querySelector<HTMLElement>('[data-guide-processing]')!,ready=root.querySelector<HTMLElement>('[data-guide-ready]')!,newQuestion=root.querySelector<HTMLButtonElement>('[data-new-question]')!;
 let listRequest=0,scrollToSaved=location.hash==='#your-guides';
 let active='',epoch=0,requestKey=crypto.randomUUID(),timer:ReturnType<typeof setTimeout>|undefined,listTimer:ReturnType<typeof setTimeout>|undefined,owner:string|undefined,books:GuideBook[]=[],selected:GuideBook[]=[],catalog:GuideBook[]|null=null;
 const query=new URLSearchParams(location.search),draftKey='awb:guide-question-draft';
 let resumeId=query.get('resume');
 try{question.value=query.get('question')||sessionStorage.getItem(draftKey)||'';}catch{question.value=query.get('question')||'';}if(launchQuestion)launchQuestion.value=question.value;
 const open=()=>{if(!dialog.open)dialog.showModal();};
 root.querySelector('[data-close-guide]')!.addEventListener('click',()=>dialog.close());
 // Closing a review keeps its draft, but consumes the explicit open intent.
 dialog.addEventListener('close',()=>{
  query.delete('resume');query.delete('id');
  if(!modalOnly){const url=new URL(location.href);url.searchParams.delete('resume');url.searchParams.delete('id');history.replaceState(null,'',url.pathname+url.search+url.hash);}
 });
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 const view=(state:'form'|'checking'|'access'|'processing'|'proposal'|'ready')=>{form.hidden=state!=='form';processing.hidden=state!=='processing';proposal.hidden=state!=='proposal';ready.hidden=state!=='ready';root.querySelector<HTMLElement>('[data-guide-checking]')!.hidden=state!=='checking';root.querySelector<HTMLElement>('[data-guide-access]')!.hidden=state!=='access';newQuestion.hidden=['form','checking','access'].includes(state);dialog.dataset.state=state;root.querySelector('#guide-dialog-title')!.textContent=state==='proposal'?'Choose your reading':state==='processing'?'Your guide is on its way':'Create your guide';};
 const showAccess=(error:any)=>{view('access');status.textContent='';root.querySelector('[data-access-question]')!.textContent=question.value;const freeLimit=error.code==='FREE_GUIDE_LIMIT',limited=error.code==='GUIDE_LIMIT';root.querySelector('[data-access-title]')!.textContent=freeLimit?'You’ve read your 3 free guides this month.':limited?'You’ve used this month’s guides.':'A question worth exploring.';root.querySelector('[data-access-description]')!.textContent=freeLimit?'Upgrade for up to 30 guides per billing month, or wait for your 3 free guides to reset next month.':limited?'Your allowance renews with your next billing period. Your saved guides are still available.':'Up to 30 guides, built from original book passages.';const action=root.querySelector<HTMLButtonElement>('[data-access-action]')!;action.textContent=limited?'Manage subscription →':'Subscribe · $24/month →';action.dataset.billingAction=limited?'portal':'checkout';};
 const accessError=(error:any)=>error.status===402||['SUBSCRIPTION_REQUIRED','GUIDE_LIMIT','FREE_GUIDE_LIMIT'].includes(error.code);
 const payment=root.querySelector<HTMLButtonElement>('[data-access-action]')!;
 payment.addEventListener('click',async()=>{
  if(payment.disabled)return;
  const action=payment.dataset.billingAction==='portal'?'portal':'checkout',label=payment.textContent,currentOwner=owner;
  payment.disabled=true;payment.setAttribute('aria-busy','true');payment.textContent=action==='checkout'?'Opening checkout…':'Opening subscription…';status.textContent='';saveDraft();
  try{
   const result=await serviceCall('reader-subscription',{action});const url=new URL(result.url);
   if(url.protocol!=='https:'||url.hostname!==(action==='checkout'?'checkout.stripe.com':'billing.stripe.com'))throw Error('Could not open the payment page. Please try again.');
   if(dialog.open&&currentOwner===owner)location.assign(url.href);
  }catch(error){if(currentOwner===owner)showError(error);}
  finally{payment.disabled=false;payment.removeAttribute('aria-busy');payment.textContent=label;}
 });
 root.querySelector('[data-edit-question]')!.addEventListener('click',()=>{view('form');question.focus();});
 const updateUrl=()=>{if(!modalOnly)history.replaceState(null,'',active?`/guides/?id=${encodeURIComponent(active)}`:'/guides/');};
 const showError=(error:unknown)=>{status.textContent=error instanceof Error?error.message:'Could not complete the request. Please try again.';};
 const reset=()=>{epoch++;clearTimeout(timer);active='';requestKey=crypto.randomUUID();view('form');status.textContent='';updateUrl();};
 const saveDraft=()=>{try{sessionStorage.setItem(draftKey,question.value);}catch{}if(launchQuestion)launchQuestion.value=question.value;};
 const drawSelection=()=>{
  root.querySelector<HTMLElement>('[data-selected-source]')!.hidden=!selected.length;
  root.querySelector('[data-selected-books]')!.replaceChildren(...selected.map(book=>{const card=bookCard(book),remove=el('button','Remove','text-sm underline mt-2');remove.type='button';remove.setAttribute('aria-label',`Remove ${book.title}`);remove.addEventListener('click',()=>{selected=selected.filter(b=>b!==book);reset();drawSelection();});card.lastElementChild!.append(remove);return card;}));
  const unavailable=selected.filter(b=>!b.id);root.querySelector('[data-book-selection-note]')!.textContent=unavailable.length?`The original text for ${unavailable.map(b=>b.title).join(', ')} isn’t in the shared library yet. Add the source to find excerpts.`:selected.length?'We’ll look for passages in these books.':'We’ll suggest books from the library for your question. You can review them before creating your guide.';
  root.querySelector<HTMLElement>('[data-auto-guide-books]')!.hidden=!selected.length;
  submit.textContent=selected.length?'Update books':'Update suggestions';
  login.textContent=selected.length?'Sign in to create and save your guide →':'Sign in to get suggested books →';
  (root.querySelector('[data-guide-upload]') as HTMLElement).hidden=!unavailable.length;submit.disabled=!!unavailable.length;
  const choices=root.querySelector('[data-guide-book-choices]')!;choices.replaceChildren();
  if(catalog){for(const book of catalog){const label=el('label','','guide-book-choice'),input=el('input');input.type='checkbox';input.setAttribute('aria-label',`${book.title}${book.author?' · '+book.author:''}`);input.checked=selected.some(b=>b.id===book.id);input.disabled=!input.checked&&selected.length>=4;input.addEventListener('change',()=>{selected=input.checked?[...selected,book]:selected.filter(b=>b.id!==book.id);reset();drawSelection();});const copy=el('span','','guide-book-choice-copy');copy.append(el('strong',book.title),el('small',book.author||''));label.append(bookCover(book),copy,input);choices.append(label);}if(!catalog.length)choices.append(el('p','No original texts are ready yet. Add a book to the shared library.','text-sm text-soft'));}
  else choices.append(el('p','Loading available books…','text-sm text-soft'));
 };
 const loadCatalog=async()=>{if(catalog)return;const found:GuideBook[]=[];let offset=0;do{const result=await serviceCall('shared-library',{action:'list',offset});found.push(...result.books);if(result.nextOffset==null)break;if(result.nextOffset<=offset)throw Error('Could not load more books.');offset=result.nextOffset;}while(true);catalog=found;};
 root.querySelector('[data-add-guide-books]')!.addEventListener('toggle',()=>{if((root.querySelector('[data-add-guide-books]') as HTMLDetailsElement).open)void loadCatalog().then(drawSelection).catch(showError);});
 root.querySelector('[data-auto-guide-books]')!.addEventListener('click',()=>{reset();selected=[];(root.querySelector('[data-add-guide-books]') as HTMLDetailsElement).open=false;drawSelection();question.focus();});
 root.querySelector('[data-guide-upload]')!.addEventListener('click',()=>{dialog.close();document.dispatchEvent(new CustomEvent('awb:open-book-upload'));});
 const showProcessing=(stage:string)=>{
  view('processing');root.querySelector('#guide-dialog-title')!.textContent=stage==='composing'?'Your guide is on its way':'Finding your reading';status.textContent='';root.querySelector('[data-processing-title]')!.textContent=stage==='composing'?'Putting your guide together':stage==='proposing'?'Connecting the passages':'Finding books for your question';root.querySelector('[data-processing-question]')!.textContent=question.value;const cover=guideCover(question.value);cover.querySelector('small')!.textContent='Your reading is taking shape';root.querySelector('[data-processing-cover]')!.replaceChildren(cover);
  root.querySelectorAll<HTMLElement>('[data-guide-step]').forEach(step=>{const current=stage==='composing'?'composing':'finding';step.dataset.state=step.dataset.guideStep===current?'active':stage==='composing'?'done':'waiting';if(step.dataset.state==='active')step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');});
 };
 const list=async()=>{
  clearTimeout(listTimer);if(!owner||modalOnly)return;const savedLink=root.querySelector<HTMLElement>('[data-open-saved-guides]');if(savedLink)savedLink.hidden=false;const currentOwner=owner,request=++listRequest;
  const shelf=root.querySelector<HTMLElement>('[data-your-guides]')!,target=root.querySelector('[data-saved-guides]')!;shelf.hidden=false;shelf.setAttribute('aria-busy','true');
  if(!target.children.length)target.append(el('p','Loading your guides…','text-soft'));
  let guides:any[];try{({guides}=await guideCall({action:'list',includeBooks:false}));}catch(error){
   if(currentOwner!==owner||request!==listRequest)return;shelf.setAttribute('aria-busy','false');
   const retry=el('button','Try again','underline');retry.addEventListener('click',()=>void list());target.replaceChildren(el('p','Could not load your guides.','text-soft'),retry);return;
  }
  if(currentOwner!==owner||request!==listRequest)return;shelf.setAttribute('aria-busy','false');
  target.replaceChildren();
  const draft=readGuideDraft();
  if(draft&&!guides.some(guide=>guide.id===draft.guideId)){
   const row=el('article','','guide-saved-card'),link=el('a');link.href=`/guides/?resume=${encodeURIComponent(draft.id)}`;
   link.append(el('h3',draft.question),el('small','Resume book selection · Saved in this browser'));
   const discard=el('button','Discard draft');discard.type='button';discard.addEventListener('click',()=>{clearGuideDraft(draft.id);if(resumeId===draft.id)resumeId=null;void list();});
   row.append(link,discard);target.append(row);
  }
  if(!guides.length&&!target.children.length)target.append(el('p','Your saved guides will appear here.','text-soft'));
  for(const guide of guides){const row=el('article','','guide-saved-card'),link=el('a');link.href=guide.status==='ready'?`/guides/read/?id=${guide.id}`:`/guides/?id=${guide.id}`;link.append(guideCover(guide.question,guide.cover),el('h3',guide.question));
   const label=guide.completed?'Finished':({ready:'Continue reading',awaiting_confirmation:'Suggested books ready',scanning:'Finding passages',proposing:'Connecting the passages',composing:'Creating your guide',gap:'No suitable passages found',failed:'Could not complete this guide'} as Record<string,string>)[guide.status]||guide.status;link.append(el('small',label));
   if(guide.status!=='ready')link.addEventListener('click',event=>{event.preventDefault();reset();active=guide.id;question.value=guide.question;open();updateUrl();void poll(active,epoch);});
   const remove=el('button',guide.status==='ready'?'Remove from your guides':'Delete');remove.type='button';remove.addEventListener('click',async()=>{remove.disabled=true;try{await guideCall({action:'delete',id:guide.id});if(active===guide.id)reset();await list();}catch(e){open();showError(e);remove.disabled=false;}});row.append(link,remove);target.append(row);
  }
  if(scrollToSaved){scrollToSaved=false;shelf.scrollIntoView({block:'start'});}
  if(guides.some((g:any)=>g.cover?.status==='pending'||['scanning','proposing','composing'].includes(g.status)))listTimer=setTimeout(()=>list().catch(showError),10000);
 };
 async function loadPublicGuides(){
  if(modalOnly)return;
  const shelf=root!.querySelector<HTMLElement>('[data-public-guides]')!,target=shelf.querySelector('[data-public-guide-list]')!;
  shelf.setAttribute('aria-busy','true');
  try{
   const {guides}=await guideCall({action:'public-list'});
   const cards=guides.filter(inCurrentCatalog).map((guide:any)=>{const link=el('a','','guide-saved-card');link.href=`/guides/read/?id=${guide.id}`;link.append(guideCover(guide.question,guide.cover),el('h3',guide.question));return link;});
   target.replaceChildren(...cards);
   if(!cards.length)target.append(el('p','New guides will appear here as they’re published.','text-soft'));
  }catch{
   const retry=el('button','Try again','underline');retry.type='button';retry.addEventListener('click',()=>void loadPublicGuides());
   target.replaceChildren(el('p','Could not load guides.','text-soft'),retry);
  }finally{shelf.setAttribute('aria-busy','false');}
 }
 async function refreshReadyCover(id:string,title:string,version:number){
  if(version!==epoch)return;
  try{const {cover}=await guideCall({action:'cover',id});if(version!==epoch)return;root.querySelector('[data-ready-cover]')!.replaceChildren(guideCover(title,cover));if(cover?.status==='pending')timer=setTimeout(()=>refreshReadyCover(id,title,version),10000);}
  catch{if(version===epoch)timer=setTimeout(()=>refreshReadyCover(id,title,version),15000);}
 }
 async function poll(id:string,version:number){
  if(version!==epoch)return;try{const {guide,books:sourceBooks=[]}=await guideCall({action:'get',id});if(version!==epoch)return;books=sourceBooks;question.value=guide.question;
   if(guide.status==='ready'){
    void loadPlan();view('ready');root.querySelector('#guide-dialog-title')!.textContent='Your guide is ready';status.textContent='';
    root.querySelector('[data-ready-title]')!.textContent=guide.question;
    root.querySelector('[data-ready-cover]')!.replaceChildren(guideCover(guide.question,guide.cover));
    root.querySelector('[data-ready-introduction]')!.textContent=guide.guide?.introduction||'';
    const minutes=guide.guide?.minutes,count=new Set((guide.guide?.sections||[]).map((s:any)=>s.bookId)).size;
    root.querySelector('[data-ready-meta]')!.textContent=[minutes?`About ${minutes} minutes`:'',count?`${count} ${count===1?'book':'books'}`:''].filter(Boolean).join(' · ');
    root.querySelector<HTMLAnchorElement>('[data-open-ready-guide]')!.href=`/guides/read/?id=${id}`;
    if(guide.cover?.status==='pending')timer=setTimeout(()=>refreshReadyCover(id,guide.question,version),5000);
    void list();void loadPublicGuides();return;
   }
   if(guide.status==='awaiting_confirmation'){active=id;view('proposal');status.textContent='';root!.querySelector('[data-proposal-question]')!.textContent=guide.question;root!.querySelector('[data-proposal-books]')!.replaceChildren(...(books.length?books:guide.proposal.books).map(bookCard));root!.querySelector('[data-proposal-connection]')!.textContent=guide.proposal.connection;confirm.disabled=false;await list();return;}
   if(['gap','failed'].includes(guide.status)){void loadPlan();view('form');drawSelection();status.textContent=guide.proposal?.gap||guide.error||'Could not complete this guide. Try a new question.';await list();return;}
   showProcessing(guide.status);timer=setTimeout(()=>poll(id,version),5000);
  }catch(error){if(version!==epoch)return;showError(error);timer=setTimeout(()=>poll(id,version),15000);}
 }
 const showReview=(sourceBooks:GuideBook[],connection:string)=>{
  books=sourceBooks;view('proposal');status.textContent='';login.hidden=true;
  root.querySelector('[data-proposal-question]')!.textContent=question.value;
  root.querySelector('[data-proposal-books]')!.replaceChildren(...books.map(bookCard));
  root.querySelector('[data-proposal-connection]')!.textContent=connection;
  confirm.disabled=!books.length;
 };
 const begin=async()=>{
  open();if(!form.reportValidity())return;if(selected.some(b=>!b.id)){view('form');drawSelection();return;}
  saveDraft();login.hidden=true;const version=++epoch;clearTimeout(timer);active='';status.textContent='';
  if(selected.length){showReview([...selected],'Your selected books. We’ll find original passages after you confirm.');return;}
  view('checking');root.querySelector('[data-checking-title]')!.textContent='Finding books for your question';root.querySelector('[data-checking-copy]')!.textContent='Looking across the library…';
  try{const result=await guideCall({action:'suggest',question:question.value.trim()});if(version!==epoch)return;
   if(!result.books?.length){view('form');drawSelection();status.textContent=result.gap||'No suitable books were found. Try editing your question or choosing books yourself.';return;}
   showReview(result.books,result.connection);
  }catch(error){if(version===epoch){view('form');drawSelection();showError(error);}}
 };
 confirm.addEventListener('click',async()=>{
  if(confirm.disabled)return;confirm.disabled=true;const version=epoch;
  const length=root.querySelector<HTMLInputElement>('input[name=length]:checked')!.value;
  const {data}=await supabase.auth.getSession();if(version!==epoch)return;owner=data.session?.user.id;
  if(!owner){
   saveDraft();try{const saved=saveGuideDraft({question:question.value,bookIds:books.map(b=>b.id),length,guideId:active},resumeId);resumeId=saved.id;location.assign(guideAuthPaths(`?from=guides&resume=${saved.id}`)!.login);}catch(error){confirm.disabled=false;showError(error);}return;
  }
  view('checking');root.querySelector('[data-checking-title]')!.textContent='Starting your guide';root.querySelector('[data-checking-copy]')!.textContent='Confirming your books and reading time…';status.textContent='';
  try{
   const result=await guideCall(active?{action:'confirm',id:active,length}:{action:'create',question:question.value.trim(),bookIds:books.map(b=>b.id),length,requestKey});
   if(version!==epoch)return;active=result.id;updateUrl();clearGuideDraft(resumeId);resumeId=null;
   showProcessing('composing');void list();void loadPlan();await poll(active,version);
  }catch(error){if(version===epoch){if(accessError(error))showAccess(error);else{view('proposal');showError(error);}confirm.disabled=false;}}
 });
 form.addEventListener('submit',event=>{event.preventDefault();void begin();});
 launcher?.addEventListener('submit',event=>{event.preventDefault();reset();selected=[];(root.querySelector('[data-add-guide-books]') as HTMLDetailsElement).open=false;question.value=launchQuestion!.value;drawSelection();void begin();});
 newQuestion.addEventListener('click',()=>{reset();selected=[];question.value='';saveDraft();drawSelection();question.focus();});
 question.addEventListener('input',()=>{reset();saveDraft();});
 root.querySelector('[data-edit-suggested-question]')!.addEventListener('click',()=>{reset();selected=[];drawSelection();question.focus();});
 root.querySelector('[data-edit-guide-books]')!.addEventListener('click',()=>{selected=[...books];reset();drawSelection();(root.querySelector('[data-add-guide-books]') as HTMLDetailsElement).open=true;});
 const openBook=async(seed:{id?:string;title:string;author?:string;coverUrl?:string|null;coverColor?:string;question?:string})=>{
  reset();selected=[{id:seed.id||'',title:seed.title,author:seed.author,coverUrl:seed.coverUrl,coverColor:seed.coverColor}];if(seed.question)question.value=seed.question;open();drawSelection();question.focus();const originalSelection=selected[0];
  try{await loadCatalog();if(!selected.includes(originalSelection))return;
   if(seed.id){const edition=catalog!.find(b=>b.id===seed.id);if(edition)selected=selected.map(b=>b===originalSelection?edition:b);}
   else{const same=(s:string)=>s.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');const editions=catalog!.filter(b=>same(b.title)===same(seed.title)&&same(b.author||'')===same(seed.author||''));if(editions.length===1)selected=selected.map(b=>b===originalSelection?editions[0]:b);}
   drawSelection();
  }catch(e){if(selected.includes(originalSelection))showError(e);}
 };
 document.addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLElement>('[data-find-excerpt]');if(button)void openBook({id:button.dataset.excerptBook,title:button.dataset.excerptTitle||'This book',author:button.dataset.excerptAuthor,coverUrl:button.dataset.excerptCover,coverColor:button.dataset.excerptColor});});
 document.addEventListener('awb:find-excerpt',event=>void openBook((event as CustomEvent).detail));
 const {data}=await supabase.auth.getSession();owner=data.session?.user.id;drawSelection();
 // The personal shelf must not wait for public browsing or billing requests.
 const loadPlan=async()=>{const currentOwner=owner;if(!currentOwner)return;try{const plan=await serviceCall('reader-subscription',{action:'status'});if(owner!==currentOwner)return;const allowance=`${Math.max(0,plan.limit-plan.used)} of ${plan.limit} ${plan.active?'':'free '}guides remaining this month`;root.querySelector('[data-guide-plan]')!.textContent=allowance;const caption=root.querySelector('[data-guide-allowance]');if(caption)caption.textContent=allowance;}catch{if(owner===currentOwner)root.querySelector('[data-guide-plan]')!.textContent='Plan status is temporarily unavailable.';}};
 const {data:auth}=supabase.auth.onAuthStateChange((_event,session)=>{if(session?.user.id===owner)return;owner=session?.user.id;listRequest++;clearTimeout(listTimer);reset();root.querySelector('[data-saved-guides]')!.replaceChildren();root.querySelector<HTMLElement>('[data-your-guides]')!.hidden=!owner||modalOnly;const savedLink=root.querySelector<HTMLElement>('[data-open-saved-guides]');if(savedLink)savedLink.hidden=!owner;root.querySelector('[data-guide-plan]')!.textContent='';const caption=root.querySelector('[data-guide-allowance]');if(caption)caption.textContent='3 free guides every month. No card needed.';login.hidden=true;if(owner)setTimeout(()=>{void list();void loadPlan();void restoreReview();},0);});
 void list();void loadPlan();
 async function restoreReview(){
  // Ordinary navigation never reopens a pending review. Auth return and saved-draft links carry explicit intent.
  if(modalOnly||!owner||!query.get('resume')||query.get('id'))return;
  const saved=readGuideDraft(resumeId);
  if(!saved){if(resumeId){open();view('form');status.textContent='This draft is no longer available in this browser. Return to the browser where you started, or enter your question again.';}return;}
  resumeId=saved.id;const version=epoch;
  question.value=saved.question;saveDraft();open();view('checking');
  root.querySelector('[data-checking-title]')!.textContent='Returning to your guide';root.querySelector('[data-checking-copy]')!.textContent='Restoring your books and reading time…';
  try{
   if(saved.guideId){active=saved.guideId;updateUrl();await poll(active,version);return;}
   await loadCatalog();if(version!==epoch)return;
   const restored=saved.bookIds.map((id:string)=>catalog!.find(book=>book.id===id)).filter(Boolean) as GuideBook[];
   if(restored.length===saved.bookIds.length){showReview(restored,'Your books are saved. Confirm when you’re ready to create your guide.');const length=root.querySelector<HTMLInputElement>(`input[name=length][value="${saved.length}"]`);if(length)length.checked=true;}
   else{selected=restored;view('form');drawSelection();status.textContent='A selected book is no longer available. Update your suggestions.';}
  }catch{if(version===epoch){view('form');drawSelection();status.textContent='Could not restore your books. Your question is saved; please try again.';}}
 }
 await restoreReview();
 if(!modalOnly){
  void loadPublicGuides();
  if(query.get('id')&&owner){active=query.get('id')!;open();void poll(active,epoch);}
 }
 window.addEventListener('pagehide',()=>{epoch++;clearTimeout(timer);clearTimeout(listTimer);auth.subscription.unsubscribe();});
}
export async function mountReader(){
 const {data:readerSession}=await supabase.auth.getSession();const signedIn=!!readerSession.session;
 const id=new URLSearchParams(location.search).get('id'),status=document.querySelector<HTMLElement>('[data-reader-status]')!,root=document.querySelector('[data-reader]')!,nav=document.querySelector('[data-reading-nav]')!;
 try{const {guide:row,books=[]}=await guideCall({action:'get',id});if(row.status!=='ready'){location.replace(`/guides/?id=${id}`);return;}if(!row.guide)throw Error(row.error||'This reading is unavailable.');const g=row.guide;status.hidden=true;(root as HTMLElement).hidden=false;
 const content=root.querySelector('[data-reading-content]')!;
 root.querySelector('[data-guide-title]')!.textContent=row.question;document.title=`${row.question} — Answer with Books`;
 const date=root.querySelector<HTMLTimeElement>('[data-guide-date]')!;date.dateTime=row.created_at;date.textContent=new Date(row.created_at).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
 root.querySelector('[data-guide-topic]')!.textContent=row.cover?.topic||'Reading';root.querySelector('[data-guide-duration]')!.textContent=`About ${g.minutes} minutes`;
 root.querySelector('[data-reader-cover]')!.append(guideCover(row.question,row.cover));root.querySelector('[data-guide-introduction]')!.textContent=g.introduction;
 const shelf=root.querySelector('[data-guide-books]')!;for(const book of books){const card=bookCard(book),title=card.querySelector('strong')!,link=el('a',book.title);link.href=`/${book.visibility==='public'?'books/read':'your-book'}/?id=${encodeURIComponent(book.id)}`;link.className='hover:text-accent';if(!book.archived)title.replaceChildren(link);shelf.append(card);}
 const addNav=(title:string,anchorId:string)=>{const anchor=el('a',title);anchor.href=`#${anchorId}`;nav.append(anchor);};addNav('Introduction','introduction');
 root.querySelector<HTMLTextAreaElement>('[data-personalize-prompt]')!.value=buildOriginalGuideReadingPrompt({title:row.question,introduction:g.introduction,sections:g.sections,conclusion:g.conclusion,...(row.visibility==='public'?{url:`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/reading-guides/${encodeURIComponent(row.id)}.md`}:{})});
 const faqs=root.querySelectorAll('[data-guide-faq] details');faqs[0].querySelector('h3')!.textContent=row.question;faqs[0].querySelector('p')!.textContent=g.conclusion;faqs[1].querySelector('p')!.textContent=`This guide draws on original selections from ${books.map((book:GuideBook)=>`${book.title}${book.author ? ` by ${book.author}` : ''}`).join('; ')}. Each excerpt has a source card with its book and original text reference. Open the book from that card to explore further.`;
 const feedback=root.querySelector<HTMLElement>('[data-content-feedback]')!;feedback.dataset.contentSlug=row.id;
 // Related by an actual shared source, not a title or keyword resemblance.
 guideCall({action:row.visibility==='public'?'public-list':'list'}).then(({guides})=>{if(closed)return;const related=guides.filter((item:any)=>item.id!==row.id&&inCurrentCatalog(item)&&(item.status==='ready'||row.visibility==='public')&&item.book_ids?.some((bookId:string)=>row.book_ids.includes(bookId))).slice(0,3);if(!related.length)return;
  const target=root.querySelector('[data-related-list]')!;for(const item of related){const card=el('article','','awb-card-link p-4'),link=el('a'),heading=el('h3',item.question,'mt-4 font-serif text-xl leading-snug');link.href=`/guides/read/?id=${encodeURIComponent(item.id)}`;link.append(guideCover(item.question,item.cover),heading);card.append(link,el('p',item.proposal?.connection||'Another question explored through these sources.','mt-3 text-sm leading-relaxed text-soft'));target.append(card);}(root.querySelector('[data-related-guides]') as HTMLElement).hidden=false;addNav('Related guides','related-guides');
 }).catch(()=>{});
 let coverTimer:ReturnType<typeof setTimeout>,closed=false;
 const refreshCover=async()=>{try{const response=await guideCall({action:row.visibility==='public'?'get':'cover',id});const cover=response.cover||response.guide.cover;if(closed)return;root.querySelector('[data-reader-cover] > div')?.replaceWith(guideCover(row.question,cover));if(cover.status==='pending')coverTimer=setTimeout(refreshCover,10000);}catch{if(!closed)coverTimer=setTimeout(refreshCover,15000);}};
 if(row.cover?.status==='pending')coverTimer=setTimeout(refreshCover,5000);
 window.addEventListener('pagehide',()=>{closed=true;clearTimeout(coverTimer);});
 const observed:HTMLElement[]=[];
 for(const [i,s] of g.sections.entries()){const section=el('section');section.id=`reading-${i}`;const anchor=el('a',s.heading);anchor.href=`#${section.id}`;nav.append(anchor);const book=books.find((b:GuideBook)=>b.id===s.bookId)||{id:s.bookId,title:s.title,author:s.author};
  const firstInBookRun=i===0||g.sections[i-1].bookId!==s.bookId;
  const run=[];for(let j=i;j<g.sections.length&&g.sections[j].bookId===s.bookId;j++)run.push(g.sections[j]);
  const source=el('aside','','excerpt-source-card');source.setAttribute('aria-label',`Excerpt from ${s.title}`);
  const copy=el('div','','excerpt-source-copy'),title=el('strong',s.title);copy.append(el('span','From the book','excerpt-source-label'));
  if(book.visibility==='public'&&!book.archived){const link=el('a',s.title);link.href=`/books/read/?id=${encodeURIComponent(book.id)}`;title.replaceChildren(link);}
  else if(book.visibility==='private'&&!book.archived){const link=el('a',s.title);link.href=`/your-book/?id=${encodeURIComponent(book.id)}`;title.replaceChildren(link);}
  copy.append(title,el('span',s.author||'','excerpt-source-author'));
  const reference=(span:any)=>Number.isInteger(span.startLine)&&Number.isInteger(span.endLine)?`lines ${span.startLine.toLocaleString()}–${span.endLine.toLocaleString()}`:'';
  const location=el('small',run.length>1?`Original text · ${run.length} passages`:`Original text · ${reference(s)}`,'excerpt-source-location');
  location.title=run.map(reference).filter(Boolean).join('; ');copy.append(location);
  if(s.bookOverview)copy.append(el('p',s.bookOverview,'excerpt-book-overview'));
  source.append(bookCover(book),copy);
  const original=el('div',formatOriginalText(s.text),'original');
  original.dataset.bookId=s.bookId;original.dataset.sourceStart=String(s.startLine??'');original.dataset.sourceEnd=String(s.endLine??'');original.setAttribute('aria-label',`${s.title}, ${reference(s)}`);
  section.append(el('h2',s.heading),el('p',s.before));if(firstInBookRun)section.append(source);section.append(original,el('p',s.after));
  if(s.interpretation){const detail=el('details');detail.append(el('summary','A closer look'),el('p',s.interpretation));section.append(detail);}
  content.append(section);observed.push(section);
 }
 const finish=el('section','','completion');finish.id='ending';finish.append(el('h2','Bringing it together'),el('p',g.conclusion));
 const totals=new Map<string,{title:string;words:number}>();for(const s of g.sections){const total=totals.get(s.bookId)||{title:s.title,words:0};total.words+=s.words;totals.set(s.bookId,total);}finish.append(el('h2','Your reading'));for(const b of totals.values())finish.append(el('p',`${b.title} · ${b.words.toLocaleString()} original words · about ${Math.ceil(b.words/250)} pages`));finish.append(el('p',`${g.originalWords.toLocaleString()} original words across ${totals.size} ${totals.size===1?'book':'books'}. Page equivalents estimated at 250 words per page.`));const done=el('button',row.completed?'Finished':'Mark as finished');done.addEventListener('click',async()=>{if(!signedIn){location.assign('/login/?from=guides');return;}done.disabled=true;try{await guideCall({action:'position',id,position:g.sections.length,completed:true});done.textContent='Finished';}catch{done.disabled=false;done.textContent='Try saving again';}});finish.append(done);content.append(finish);
 const further=el('section','','guide-source-books');further.id='source-books';further.append(el('h2','Read the books'));const cards=el('div','','guide-purchase-grid');
 for(const bookId of totals.keys()){const s=g.sections.find((s:any)=>s.bookId===bookId),book=books.find((b:GuideBook)=>b.id===bookId)||{id:bookId,title:s.title,author:s.author};const card=el('article','','guide-purchase-card'),copy=el('div');copy.append(el('h3',book.title),el('p',book.author||'','text-soft'));const amazon=el('a','Find on Amazon ↗','awb-pill');amazon.href='https://www.amazon.com/s?k='+encodeURIComponent(`${book.title} ${book.author||''}`);amazon.target='_blank';amazon.rel='noopener noreferrer';copy.append(amazon);card.append(bookCover(book),copy);cards.append(card);}
 further.append(cards);content.append(further);addNav('Read the books','source-books');addNav('Bringing it together','ending');addNav('Personalize','personalize');addNav('Guide Q&A','guide-qa');
 let saveTimer:ReturnType<typeof setTimeout>;const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];if(!visible)return;clearTimeout(saveTimer);const position=observed.indexOf(visible.target as HTMLElement);if(signedIn)saveTimer=setTimeout(()=>guideCall({action:'position',id,position}).catch(()=>{}),800);},{rootMargin:'-15% 0px -55% 0px'});observed.forEach(s=>observer.observe(s));if(!location.hash&&row.position>0)document.getElementById(row.position===g.sections.length?'ending':`reading-${row.position}`)?.scrollIntoView();window.addEventListener('pagehide',()=>{observer.disconnect();clearTimeout(saveTimer);});
 }catch(e){status.textContent=e instanceof Error?e.message:'Could not open this reading.';}
}
