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
// Some scans pull the closing quote before "said" onto a line of its own, leaving
// `"But, said Bob Bogle` and a lone `"` nearby. Only books with that signature
// (20+ lone quote lines) are repaired: the lone marks are blanked and the first
// speech tag after an unclosed quote on the same line gets its closing mark back.
// Words are never changed.
const loneQuote=/^\s*["“”]\s*$/;
const speechTag=/,(?=\s+(?:(?:he|she|they|I|we)\s+(?:said|says|added|recalled|explained|told)\b|(?:said|says|added|recalled|explained)\b|[A-Z][\w.]*(?:\s+[A-Z][\w.]*){0,2},?\s+(?:said|says|added|recalled|explained)\b))/g;
const quoteCache=new Map();
export function displacedQuotes(book){
 if(typeof book?.source_text!=='string')return false;
 const key=book.source_sha||book.source_text_sha||book.id;if(key&&quoteCache.has(key))return quoteCache.get(key);
 let lone=0;for(const line of book.source_text.split('\n'))if(loneQuote.test(line))lone++;
 if(key){if(quoteCache.size>50)quoteCache.clear();quoteCache.set(key,lone>=20);}
 return lone>=20;
}
export function restoreSpeechQuotes(line){
 let out='',last=0;
 for(const m of line.matchAll(speechTag)){
  const before=line.slice(0,m.index);
  if((before.match(/"/g)||[]).length%2===1&&!/"\s*$/.test(before)){out+=line.slice(last,m.index)+',"';last=m.index+1;
   // The restored mark closes the quote; later tags on this line need a new opening quote.
   const rest=restoreSpeechQuotes(line.slice(last));return out+rest;}
 }
 return out+line.slice(last);
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
const quotes=displacedQuotes(book);
 const unpaged0=headers.size?repaired.split('\n').map(line=>{const h=headerParts(line);return h&&headers.has(h.title)?'':line;}).join('\n'):repaired;
 const unpaged=quotes?unpaged0.split('\n').map(line=>loneQuote.test(line)?'':restoreSpeechQuotes(line)).join('\n'):unpaged0;
 return unpaged.replace(/[ﬀ-ﬆ]/g,char=>ligatures[char]);
}
