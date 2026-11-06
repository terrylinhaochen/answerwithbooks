import {bookJacketMarkup} from './book-jacket.mjs';
const el=(tag:string,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;node.className=className;return node;};
// Public uploads use the same shelf layout as the curated catalog and private books.
export function sharedBookCard(book:any,index=0,showExcerpt=true){
 const card=el('article','','library-book');card.dataset.sharedBookId=book.id;
 const href=`/books/read/?id=${encodeURIComponent(book.id)}`;
 const cover=document.createElement('a');cover.href=href;cover.className='library-cover';cover.setAttribute('aria-label',`Open ${book.title}`);cover.style.setProperty('--book-well',['#e2e3d6','#e9e0d2','#e0e4df'][index%3]);
 const jacket=el('span','','library-jacket');jacket.innerHTML=bookJacketMarkup({title:book.title,author:book.author||'',color:book.coverColor,coverAsset:book.coverUrl});
 const arrow=el('span','↗','library-open');arrow.setAttribute('aria-hidden','true');cover.append(jacket,arrow);
 const body=el('div','','library-copy'),heading=el('h3'),link=document.createElement('a');link.href=href;link.textContent=book.title;heading.append(link);
 body.append(el('p','Source book','room-eyebrow'),heading,el('p',book.author,'library-author'),el('p',book.orientation||'','library-description'));
 if(book.stage==='ready'&&showExcerpt){
  const excerpt=el('button','Find an excerpt','mt-4 text-sm underline') as HTMLButtonElement;excerpt.type='button';excerpt.dataset.findExcerpt='';excerpt.dataset.excerptBook=book.id;excerpt.dataset.excerptTitle=book.title;excerpt.dataset.excerptAuthor=book.author;excerpt.setAttribute('aria-haspopup','dialog');body.append(excerpt);
 }else if(book.stage!=='ready')body.append(el('p',book.stage==='failed'?'Processing needs attention':book.stage==='extracting'?'Reading the file…':'Mapping chapters…','mt-3 text-sm text-soft'));
 card.append(cover,body);return card;
}
