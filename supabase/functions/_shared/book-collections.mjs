import {splitSource} from './book-sections.mjs';
import {sanitizeSource} from './upstream-sanitize.mjs';
/** Coordinates refer to normalized combined source.txt; fingerprints identify declared originals. */
export function collectionSources(sources,text) {
 if(sources==null)return null;
 if(!Array.isArray(sources)||!sources.length||sources.length>10)throw Error('Invalid collection sources.');
 const lines=typeof text==='string'?text.split('\n'):null;let previous=0;
 return sources.map((s,i)=>{
  if(!s||typeof s.name!=='string'||!s.name||s.name.length>255||/[\r\n\/\\]/.test(s.name)||!(/^[a-f0-9]{64}$/).test(s.sha256||'')||!Number.isSafeInteger(s.startLine)||!Number.isSafeInteger(s.endLine)||s.startLine<=previous||s.endLine<s.startLine)throw Error('Invalid collection source range.');
  if(lines&&(s.endLine>lines.length||lines[s.startLine-1]!==`# SOURCE: ${s.name}`||lines[s.startLine]!==`Source SHA-256: ${s.sha256}`))throw Error('Collection source coordinates do not match the extracted text.');
  previous=s.endLine;
  return {sourceId:`S${i+1}`,name:s.name,sha:s.sha256,startLine:s.startLine,endLine:s.endLine};
 });
}

export const collectionGuidance='This is one guide built from separate sources. Preserve attribution to each source and its scope or edition. Keep disagreements visible; do not blend conflicting prescriptions into a single author claim. Distinguish shared principles from source-specific rules and mark any cross-source application as derived. A table of contents is not evidence that the listed chapters were supplied.';
export function collectionChunks(chunks,manifest){
 if(!manifest)return chunks;
 return chunks.map(chunk=>({...chunk,sourceDocuments:manifest.filter(s=>s.startLine<=chunk.end&&s.endLine>=chunk.start).map(s=>({name:s.name,startLine:s.startLine,endLine:s.endLine}))}));
}

export function buildSourceCollection(parts,title){
 if(typeof title!=='string'||!title.trim()||title.length>200||/[\r\n]/.test(title))throw Error('Choose a one-line guide title up to 200 characters.');
 let text=`# ${title}\n\nThis is a collection of separate sources. Keep author claims and document boundaries distinct.\n`,sources=[];
 for(const part of parts){
  const startLine=text.split('\n').length+1;
  text+=`\n# SOURCE: ${part.name}\nSource SHA-256: ${part.sha256}\n\n${splitSource(sanitizeSource(part.text.trim())).text}\n`;
  sources.push({name:part.name,sha256:part.sha256,startLine,endLine:text.split('\n').length-1});
 }
 collectionSources(sources,text);
 return {text,sources,headings:sources.map(s=>({line:s.startLine,title:`# SOURCE: ${s.name}`,displayTitle:s.name}))};
}
