import {guideCoverPalettes,guideCoverVersion} from '../../supabase/functions/_shared/guide-cover.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function generatedGuideCoverMarkup(question,design={}) {
 if(design.version!==guideCoverVersion||!design.src)return null;
 // Signed storage URLs and local artwork are valid; never interpolate arbitrary schemes.
 if(!/^https?:\/\//.test(design.src)&&!/^\/(?!\/)/.test(design.src))return null;
 const ink=guideCoverPalettes.includes(design.background)?design.background:guideCoverPalettes[0];
 const label=String(design.label||question).slice(0,55);
 return `<div class="print-guide print-guide-generated${label.length>32?' print-guide-long-title':''}" style="--print-ink:${ink}" aria-hidden="true"><div class="print-guide-paper"><div class="print-guide-meta"><span>Answer with Books</span><span>Reading guide</span></div><div class="print-guide-title"><small>${escape(design.topic||'A question to live with')}</small><span>${escape(label)}</span></div><div class="print-guide-art"><img src="${escape(design.src)}" alt="" decoding="async" loading="lazy" width="1024" height="1024" /></div><div class="print-guide-foot"><span>Original passages.</span><span>New connections.</span></div></div></div>`;
}
