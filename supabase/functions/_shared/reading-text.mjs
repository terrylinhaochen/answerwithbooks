import {createHash} from 'node:crypto';
import dyson from './source-repairs/dyson-ligatures.json' with {type:'json'};
import green from './source-repairs/green-ligatures.json' with {type:'json'};
import fastenal from './source-repairs/fastenal-pages.json' with {type:'json'};
const repairs=[dyson,green,fastenal];
const ligatures={'ﬀ':'ff','ﬁ':'fi','ﬂ':'fl','ﬃ':'ffi','ﬄ':'ffl','ﬅ':'st','ﬆ':'st'};
// Never spell-correct prose. Repairs are verified against one exact uploaded PDF
// and exact original line bytes; stored source, coordinates and hashes stay intact.
// A scanned book's running header (title + page number on its own line) can land
// mid-sentence. Only text repeated as a header on at least three pages counts, so a
// table-of-contents or index line, or a numeric table row, is never removed.
const headerShape=/^\s{6,}(\S.{0,70}?\S)\s{6,}(\d{1,4})\s*$|^\s*(\d{1,4})\s{6,}(\S.{0,70}?\S)\s*$/;
const headerCache=new Map();
const headerParts=line=>{const m=headerShape.exec(line);if(!m)return null;const title=(m[1]||m[4]).trim();return (title.match(/[A-Za-z]/g)||[]).length>=3?{title,page:m[2]||m[3]}:null;};
export function runningHeaders(book){
 if(typeof book?.source_text!=='string')return new Set();
 const key=book.source_sha||book.source_text_sha||book.id;if(key&&headerCache.has(key))return headerCache.get(key);
 const pages=new Map();
 for(const line of book.source_text.split('\n')){const h=headerParts(line);if(h){if(!pages.has(h.title))pages.set(h.title,new Set());pages.get(h.title).add(h.page);}}
 const titles=new Set([...pages].filter(([,seen])=>seen.size>=3).map(([title])=>title));
 if(key){if(headerCache.size>50)headerCache.clear();headerCache.set(key,titles);}
 return titles;
}
export function readableSourceText(text,book,startLine){
 const repaired=text.split('\n').map((line,index)=>{
  const patch=repairs.find(repair=>book.source_sha===repair.sourceSha)?.patches[String(startLine+index)];
  if(!patch||createHash('sha256').update(line).digest('hex')!==patch.sha256)return line;
  for(const [start,end,oldText,replacement] of [...patch.edits].reverse()){
   if(line.slice(start,end)!==oldText)return text.split('\n')[index];
   line=line.slice(0,start)+replacement+line.slice(end);
  }
  return line;
 }).join('\n');
 const headers=runningHeaders(book);
 // Blank, not delete, so line coordinates stay identical to the stored source.
 const unpaged=headers.size?repaired.split('\n').map(line=>{const h=headerParts(line);return h&&headers.has(h.title)?'':line;}).join('\n'):repaired;
 return unpaged.replace(/[ﬀ-ﬆ]/g,char=>ligatures[char]);
}
