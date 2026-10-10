import {collectionSources} from './book-collections.mjs';
import {renderBookArtifacts} from './book-artifacts.mjs';
import {splitSource} from './book-sections.mjs';
import {scanSkill} from './book-skill-review.mjs';
export const importByteLimit=16*1024*1024;
export const canonical=value=>JSON.stringify(value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonical(value[k]))])):Array.isArray(value)?value.map(v=>JSON.parse(canonical(v))):value);
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join('');
const pick=(value,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(value,k)).map(k=>[k,value[k]]));
export async function prepareAgentImport(input,id=crypto.randomUUID()) {
 if(!input||input.schemaVersion!==1||Object.keys(input).some(k=>!['schemaVersion','title','author','sourceText','book','chapters','glossary','sources'].includes(k)))throw Error('Use a version 1 local workspace package.');
 if(new TextEncoder().encode(JSON.stringify(input)).length>importByteLimit)throw Error('Package exceeds 16 MB.');
 for(const k of ['title','author'])if(typeof input[k]!=='string'||!input[k].trim()||input[k].length>200)throw Error('Invalid book metadata.');
 if(typeof input.sourceText!=='string'||input.sourceText.length<100||input.sourceText.length>6000000||input.sourceText.includes('\r'))throw Error('Invalid extracted source.');
 const source=splitSource(input.sourceText);if(source.text!==input.sourceText)throw Error('Source line coordinates changed. Use the normalized local workspace source.');
 if(!Array.isArray(input.chapters)||!input.chapters.length||input.chapters.length>500)throw Error('Invalid chapter count.');
 const chapters=input.chapters.map(ch=>{
  if(!ch||!Array.isArray(ch.ideas)||ch.ideas.length>8)throw Error('Invalid chapter ideas.');
  return {...pick(ch,['id','title','summary','sourceRefs','antiPatterns','workedExamples','technicalReferences']),ideas:ch.ideas.map(idea=>{if(!idea||!['derived-application','source-instruction'].includes(idea.applicationBasis))throw Error('Every application needs an explicit attribution basis.');return pick(idea,['name','explanation','whenToUse','decisionRule','steps','limits','sourceRefs','applicationBasis']);})};
 });
 const manifest=collectionSources(input.sources,source.text);
 if(manifest)for(const ch of chapters)ch.sourceDocuments=manifest.filter(s=>ch.sourceRefs?.some(r=>r.startLine<=s.endLine&&r.endLine>=s.startLine)).map(s=>({name:s.name,startLine:s.startLine,endLine:s.endLine}));
 const sha=await digest(source.text),data={schemaVersion:1,jobId:id,sourceSha256:sha,textSha256:sha,book:input.book,chapters,glossary:input.glossary,coverage:{scope:'partial',gaps:['Imported from a customer agent. Extraction completeness and semantic source support have not been verified by Answer with Books.']}};
 const meta={id,sourceText:source.text,book:{title:input.title,author:input.author},source:{sha256:sha,textSha256:sha,lineCount:source.lineCount}};
 // Render only server-owned paths from structured data; uploaded code and paths are never executed.
 const artifacts=renderBookArtifacts(meta,data);
 artifacts['skill/source.txt']=source.text;
 artifacts['quality-review.json']=JSON.stringify({version:0,origin:'customer-agent',validation:'structure-and-citation-bounds',sectionsReviewed:0,totalSections:chapters.length,limitations:'Client reviews are not trusted as server verification. Check each claim against its cited source.'});
 const findings=scanSkill(artifacts);if(findings.length)throw Error('The imported skill has advisory findings. Review and remove unsafe instructions before importing.');
 const packageSha=await digest(canonical(input));
 return {packageSha,job:{id,title:input.title,author:input.author,source_name:'agent-source.txt',source_manifest:manifest||[{sourceId:'S1',name:'agent-source.txt',sha,startLine:1,endLine:source.lineCount}],source_sha:sha,source_text:source.text,chunks:source.chunks,notes:chapters,artifacts,skill_summary:{one_liner:input.book.oneLiner,read_if:input.book.readIf,tags:input.book.tags}}};
}
