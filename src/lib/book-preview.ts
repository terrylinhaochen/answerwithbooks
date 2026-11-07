// One lightweight preview for static catalog books and ready public uploads.
// Card links remain usable without JavaScript and with modifier-clicks.
const dialog=document.querySelector<HTMLDialogElement>('#book-preview');
if(dialog){
 let cards:HTMLElement[]=[],selected=0,opener:HTMLElement|null=null,previousOverflow='';
 const field=(selector:string)=>dialog.querySelector<HTMLElement>(selector)!;
 const prompt=dialog.querySelector<HTMLTextAreaElement>('[data-preview-prompt]')!;
 const resetStatus='Copies a link to this book and the Answer with Books skill.';
 const show=(index:number)=>{
  selected=(index+cards.length)%cards.length;
  const card=cards[selected],book=JSON.parse(card.dataset.bookPreview!);
  field('#book-preview-title').textContent=book.title;
  field('[data-preview-category]').textContent=book.category||'Book';
  field('[data-preview-author]').textContent=[book.author,book.year].filter(Boolean).join(' · ');
  field('[data-preview-description]').textContent=book.description||'';
  field('[data-preview-task]').textContent=book.task||'Connect this book to a question of your own.';
  const href=new URL(book.href,location.origin);
  const link=dialog.querySelector<HTMLAnchorElement>('[data-preview-link]')!;link.href=href.pathname+href.search;
  const jacket=card.querySelector('.jacket');field('[data-preview-jacket]').replaceChildren(...(jacket?[jacket.cloneNode(true)]:[]));
  const publicUrl=new URL(href.pathname+href.search,'https://answerwithbooks.com/');
  prompt.value=`Read ${publicUrl.href} and https://answerwithbooks.com/SKILL.md. Help me connect ${book.title} to my own experience. Start by asking what question or task I want to explore.${book.task ? ` A possible starting point: ${book.task}` : ''} Use the available book material, cite your sources, and distinguish quotations from interpretation.`;
  prompt.hidden=true;field('[data-preview-status]').textContent=resetStatus;
  field('[data-preview-position]').textContent=`${String(selected+1).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;
  dialog.querySelector<HTMLElement>('.preview-navigation')!.hidden=cards.length<2;
 };
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const anchor=(event.target as Element).closest<HTMLAnchorElement>('.library-cover[href],.library-copy h3 a[href]');
  const card=anchor?.closest<HTMLElement>('[data-book-preview]');if(!card||!anchor)return;
  const group=card.closest('.library-grid,[data-shared-book-list]')||card.parentElement!;
  cards=Array.from(group.querySelectorAll<HTMLElement>('[data-book-preview]')).filter(el=>el.getClientRects().length>0);
  if(!cards.includes(card))cards=[card];
  event.preventDefault();opener=anchor;show(cards.indexOf(card));previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();
 });
 field('[data-preview-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow;opener?.focus({preventScroll:true});});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 field('[data-preview-previous]').addEventListener('click',()=>show(selected-1));field('[data-preview-next]').addEventListener('click',()=>show(selected+1));
 dialog.addEventListener('keydown',event=>{if((event.target as HTMLElement).matches('textarea,input'))return;if(event.key==='ArrowLeft'){event.preventDefault();show(selected-1);}if(event.key==='ArrowRight'){event.preventDefault();show(selected+1);}});
 field('[data-preview-copy]').addEventListener('click',async()=>{const value=prompt.value;try{await navigator.clipboard.writeText(value);if(prompt.value===value)field('[data-preview-status]').textContent='Copied. Paste into your AI chat to begin.';}catch{if(prompt.value===value){prompt.hidden=false;prompt.focus();prompt.select();field('[data-preview-status]').textContent='Copy the prompt below, then paste it into your AI chat.';}}});
}
