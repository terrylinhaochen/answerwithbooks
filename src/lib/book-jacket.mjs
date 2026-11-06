// Shared public/private jacket markup; all source-provided text is escaped.
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bookJacketMarkup({title,author,color,coverAsset,loading='lazy',composed=false}) {
 const cloth=/^#[a-f0-9]{6}$/i.test(color||'')?color:'#304c44';
 const asset=typeof coverAsset==='string'&&(/^(https?:\/\/|\/(?!\/))/.test(coverAsset))?coverAsset:null;
 return `<span class="jacket${composed?' jacket--composed':''}${title.length>28?' jacket--long':''}${title.length>50?' jacket--very-long':''}" style="--cloth:${cloth}" aria-hidden="true">
 <span class="jacket-back"></span><span class="jacket-pages"></span><span class="jacket-page-top"></span><span class="jacket-page-bottom"></span>
 <span class="jacket-spine"><span>${escape(title)}</span></span><span class="jacket-board-edge"></span><span class="jacket-board-foot"></span>
 <span class="jacket-face"><span class="jacket-art">${asset?`<img crossorigin="anonymous" src="${escape(asset)}" alt="${composed?escape(`${title} — ${author}`):''}" width="${composed?1200:848}" height="${composed?1800:1264}" loading="${loading==='eager'?'eager':'lazy'}" decoding="async" draggable="false" />`:''}</span>
 <span class="jacket-type"><span class="jacket-title">${escape(title)}</span><span class="jacket-author">${escape(author)}</span></span></span></span>`;
}
