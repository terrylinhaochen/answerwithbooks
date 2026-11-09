import {createHash} from 'node:crypto';
import dyson from './source-repairs/dyson-ligatures.json' with {type:'json'};
import green from './source-repairs/green-ligatures.json' with {type:'json'};
import fastenal from './source-repairs/fastenal-pages.json' with {type:'json'};
const repairs=[dyson,green,fastenal];
const ligatures={'ﬀ':'ff','ﬁ':'fi','ﬂ':'fl','ﬃ':'ffi','ﬄ':'ffl','ﬅ':'st','ﬆ':'st'};
// Never spell-correct prose. Repairs are verified against one exact uploaded PDF
// and exact original line bytes; stored source, coordinates and hashes stay intact.
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
 return repaired.replace(/[ﬀ-ﬆ]/g,char=>ligatures[char]);
}
