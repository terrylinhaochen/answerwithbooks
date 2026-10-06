import { mountShelfPersonalizer } from './shelf-personalizer';
const lab = document.querySelector<HTMLElement>('[data-shelf-lab]');
if (lab) {
 const dialog = lab.querySelector<HTMLDialogElement>('#shelf-book-detail')!;
 const stage = lab.querySelector<HTMLElement>('[data-book-stage]')!;
 let books = JSON.parse(lab.querySelector('[data-shelf-data]')!.textContent || '[]');
 const defaults = books.map((book: {slug: string}) => book.slug);
 const catalog = JSON.parse(lab.querySelector('[data-shelf-catalog]')!.textContent || '[]');
 const catalogBySlug = new Map<string, any>(catalog.map((book: {slug: string}) => [book.slug, book]));
 const prompts = new Map<string, string>(books.map((book: {slug: string; prompt: string}) => [book.slug, book.prompt]));
 const buttons = Array.from(lab.querySelectorAll<HTMLButtonElement>('[data-pick-book]'));
 const places = Array.from(lab.querySelectorAll<HTMLElement>('[data-book-place]'));
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let selected = 0;
 let returnFocus: HTMLButtonElement | null = null;
 let savedOverflow = '';
 const text = (selector: string, value: string) => { lab.querySelector(selector)!.textContent = value; };
 const updateChrome = () => {
  const header = document.querySelector('body > header');
  const controls = lab.querySelector('.lab-controls');
  lab.style.setProperty('--lab-chrome',`${(header?.getBoundingClientRect().height||0)+(controls?.getBoundingClientRect().height||0)}px`);
 };
 const observer = new ResizeObserver(updateChrome);
 const header = document.querySelector('body > header');
 if(header) observer.observe(header);
 const controls = lab.querySelector('.lab-controls');
 if (controls) observer.observe(controls);
 updateChrome();
 const changeDirection = (direction: string) => {
  lab.dataset.direction = direction;
  lab.querySelectorAll<HTMLButtonElement>('[data-direction-button]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.directionButton===direction)));
  stage.scrollLeft = 0;
  places.forEach(place=>{place.style.removeProperty('--drag-x');place.style.removeProperty('--drag-y');});
  const url = new URL(location.href);url.searchParams.set('direction',direction);history.replaceState(null,'',url);
 };
 lab.querySelectorAll<HTMLButtonElement>('[data-direction-button]').forEach(button=>button.addEventListener('click',()=>changeDirection(button.dataset.directionButton!)));
 lab.querySelectorAll<HTMLButtonElement>('[data-direction-button]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.directionButton===lab.dataset.direction)));
 lab.querySelector('[data-reset-books]')?.addEventListener('click',()=>places.forEach(place=>{place.style.removeProperty('--drag-x');place.style.removeProperty('--drag-y');}));
 const populate = (index: number) => {
  selected=(index+books.length)%books.length;
  const book=books[selected];
  text('#shelf-detail-title',book.title);text('[data-detail-category]',book.label);text('[data-detail-author]',`${book.author} · ${book.year}`);text('[data-detail-question]',book.task.label);text('[data-detail-description]',book.oneLiner);text('[data-detail-position]',`${String(selected+1).padStart(2,'0')} / ${String(books.length).padStart(2,'0')}`);
  const prompt=lab.querySelector<HTMLTextAreaElement>('[data-detail-prompt]')!;prompt.value=prompts.get(book.slug) || '';prompt.hidden=true;
  const copy=lab.querySelector<HTMLButtonElement>('[data-detail-copy]')!;copy.disabled=!prompt.value;
  text('[data-detail-copy-status]', prompt.value ? 'Copies the book’s digest and this task. Paste into your agent.' : 'Loading this book’s task…');
  if (!prompt.value) void fetch(`/book-prompts/${encodeURIComponent(book.slug)}.json`).then(async response => {
   if (!response.ok) throw new Error('Unavailable');
   const result=await response.json();if(result.slug!==book.slug || typeof result.prompt!=='string' || !result.prompt) throw new Error('Invalid prompt');
   prompts.set(book.slug,result.prompt);
   if(books[selected]?.slug===book.slug){prompt.value=result.prompt;copy.disabled=false;text('[data-detail-copy-status]','Copies the book’s digest and this task. Paste into your agent.');}
  }).catch(()=>{if(books[selected]?.slug===book.slug)text('[data-detail-copy-status]','Couldn’t load the task. Open the book, or close and try again.');});
  lab.querySelector<HTMLAnchorElement>('[data-detail-link]')!.href=`/books/${book.slug}/`;
  lab.querySelectorAll<HTMLElement>('[data-detail-jacket]').forEach((item,i)=>{item.hidden=i!==selected;});
 };
 const pickUp = (index: number, source: HTMLButtonElement) => {
  const from = source.getBoundingClientRect();
  const sourceAngle = new DOMMatrix(getComputedStyle(source).transform);
  sourceAngle.m41 = sourceAngle.m42 = sourceAngle.m43 = 0;
  returnFocus = source;
  populate(index);
  savedOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  dialog.showModal();
  if (!reduced.matches) {
   const target = lab.querySelector<HTMLElement>(`[data-detail-jacket="${index}"]`)!;
   const to = target.getBoundingClientRect();
   const restingTransform = getComputedStyle(target).transform;
   const dx = from.x + from.width / 2 - to.x - to.width / 2;
   const dy = from.y + from.height / 2 - to.y - to.height / 2;
   // Opacity below 1 flattens preserve-3d children. Move the complete book
   // with its existing angle so the page block stays visible throughout.
   target.animate([
    {transform: `translate(${dx}px,${dy}px) scale(${source.offsetWidth / target.offsetWidth}) ${sourceAngle.toString()}`},
    {transform: restingTransform},
   ], {duration: 620, easing: 'cubic-bezier(.2,.8,.2,1)'});
  }
 };
 dialog.addEventListener('close',()=>{document.body.style.overflow=savedOverflow;returnFocus?.focus({preventScroll:true});});
 lab.querySelector('[data-close-book]')?.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
 lab.querySelector('[data-previous-book]')?.addEventListener('click',()=>populate(selected-1));
 lab.querySelector('[data-next-book]')?.addEventListener('click',()=>populate(selected+1));
 dialog.addEventListener('keydown',event=>{if((event.target as HTMLElement).matches('textarea,input'))return;if(event.key==='ArrowLeft'){event.preventDefault();populate(selected-1);}if(event.key==='ArrowRight'){event.preventDefault();populate(selected+1);}});
 lab.querySelector('[data-detail-copy]')?.addEventListener('click',async()=>{
  const index=selected;const prompt=lab.querySelector<HTMLTextAreaElement>('[data-detail-prompt]')!;
  try {await navigator.clipboard.writeText(prompt.value);if(selected===index)text('[data-detail-copy-status]','Copied. Paste into your agent to start the task.');}
  catch {if(selected===index){prompt.hidden=false;prompt.focus();prompt.select();text('[data-detail-copy-status]','Select and copy the prompt below, then paste it into your agent.');}}
 });
 buttons.forEach((button,index)=>{
  const place=places[index];let drag: {id:number;x:number;y:number;ox:number;oy:number;moved:boolean;rect:DOMRect;bounds:DOMRect}|null=null;let suppressClick=false;
  button.addEventListener('pointermove',event=>{
   if(drag){
    const dx=event.clientX-drag.x;const dy=event.clientY-drag.y;
    if(Math.hypot(dx,dy)>6){drag.moved=true;place.classList.add('is-dragging');}
    if(drag.moved){event.preventDefault();const x=Math.max(drag.bounds.left-drag.rect.left-8,Math.min(drag.bounds.right-drag.rect.right+8,dx));const y=Math.max(drag.bounds.top-drag.rect.top-10,Math.min(drag.bounds.bottom-drag.rect.bottom+10,dy));place.style.setProperty('--drag-x',`${drag.ox+x}px`);place.style.setProperty('--drag-y',`${drag.oy+y}px`);}
   }else if(event.pointerType==='mouse'&&!reduced.matches){const rect=button.getBoundingClientRect();button.style.setProperty('--tilt-y',`${(event.clientX-rect.left)/rect.width*12-33}deg`);button.style.setProperty('--tilt-x',`${6-(event.clientY-rect.top)/rect.height*9}deg`);}
  });
  button.addEventListener('pointerdown',event=>{
   suppressClick=false;
   if(lab.dataset.direction!=='table'||event.button!==0)return;
   drag={id:event.pointerId,x:event.clientX,y:event.clientY,ox:parseFloat(place.style.getPropertyValue('--drag-x'))||0,oy:parseFloat(place.style.getPropertyValue('--drag-y'))||0,moved:false,rect:place.getBoundingClientRect(),bounds:stage.getBoundingClientRect()};
   button.setPointerCapture(event.pointerId);
  });
  const endDrag=()=>{if(!drag)return;suppressClick=drag.moved;drag=null;place.classList.remove('is-dragging');};
  button.addEventListener('pointerup',endDrag);button.addEventListener('pointercancel',endDrag);button.addEventListener('lostpointercapture',endDrag);
  button.addEventListener('click',event=>{if(suppressClick&&event.detail!==0){event.preventDefault();suppressClick=false;return;}suppressClick=false;pickUp(index,button);});
  button.addEventListener('keydown',event=>{if(lab.dataset.direction==='table'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const dx=event.key==='ArrowLeft'?-12:event.key==='ArrowRight'?12:0;const dy=event.key==='ArrowUp'?-12:event.key==='ArrowDown'?12:0;const r=place.getBoundingClientRect();const bounds=stage.getBoundingClientRect();const x=parseFloat(place.style.getPropertyValue('--drag-x'))||0;const y=parseFloat(place.style.getPropertyValue('--drag-y'))||0;place.style.setProperty('--drag-x',`${x+Math.max(bounds.left-r.left,Math.min(bounds.right-r.right,dx))}px`);place.style.setProperty('--drag-y',`${y+Math.max(bounds.top-r.top,Math.min(bounds.bottom-r.bottom,dy))}px`);}});
 });
 const applySelection = (ids: string[]) => {
  if (ids.length!==5 || ids.some(id=>!catalogBySlug.has(id)) || new Set(ids).size!==5) return;
  buttons.forEach((button,i)=>{button.dataset.bookSlug=books[i].slug;});
  if(ids.every((id,i)=>id===books[i].slug))return;
  if(dialog.open)dialog.close();
  books=ids.map(id=>catalogBySlug.get(id));
  books.forEach((book: any,index: number)=>{
   const template=Array.from(lab.querySelectorAll<HTMLTemplateElement>('[data-shelf-cover]')).find(item=>item.dataset.shelfCover===book.slug)!;
   buttons[index].replaceChildren(template.content.cloneNode(true));buttons[index].setAttribute('aria-label',`Pick up ${book.title}`);buttons[index].dataset.bookSlug=book.slug;
   lab.querySelector(`[data-detail-jacket="${index}"]`)!.replaceChildren(template.content.cloneNode(true));
   places[index].style.setProperty('--cloth',book.color);places[index].style.removeProperty('--drag-x');places[index].style.removeProperty('--drag-y');
   const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');places[index].querySelector('.book-caption')!.replaceChildren(number,document.createTextNode(book.label));
  });
 };
 applySelection(defaults);
 mountShelfPersonalizer({lab, defaults, catalog, applySelection});
 const object=lab.querySelector<HTMLElement>('[data-detail-object]')!;
 object.addEventListener('pointermove',event=>{if(event.pointerType!=='mouse'||reduced.matches)return;const r=object.getBoundingClientRect();object.style.setProperty('--detail-y',`${(event.clientX-r.left)/r.width*20-38}deg`);object.style.setProperty('--detail-x',`${7-(event.clientY-r.top)/r.height*10}deg`);});
}
