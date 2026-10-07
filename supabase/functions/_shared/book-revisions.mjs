import {splitSource} from './book-sections.mjs';
import limits from './book-upload-limits.json' with {type:'json'};

export function sourceManifest(job) {
 if(Array.isArray(job.source_manifest)&&job.source_manifest.length)return job.source_manifest;
 return [{sourceId:'S1',name:job.source_name,sha:job.source_sha,jobId:job.id,startLine:1,endLine:job.source_text.split('\n').length}];
}

/** One citation coordinate system across revisions; old line numbers never move.
 * S1 always denotes the combined source.txt. source_manifest locates originals.
 * Prior notes are reused only for append; replacement processes all new text.
 */
export function finalizeBookSource(job,text,headings=[],parent) {
 if(typeof text!=='string'||text.trim().length<100)throw new Error('The source needs at least 100 readable characters.');
 const source=splitSource(text,headings);
 if(job.parent_job_id&&(!parent||parent.id!==job.parent_job_id||parent.user_id!==job.user_id||parent.book_id!==job.book_id||parent.status!=='ready'))throw new Error('The prior revision does not belong to this book or is not ready.');
 const entry={name:job.source_name,sha:job.source_sha,jobId:job.id};
 if(job.revision_kind!=='append')return {
  source_text:source.text,chunks:source.chunks,cursor:0,notes:[],overview_notes:[],
  source_manifest:[{...entry,sourceId:'S1',startLine:1,endLine:source.lineCount}],
 };
 if(!parent||parent.notes.length!==parent.chunks.length)throw new Error('Finish the prior revision before adding sources.');
 const manifest=sourceManifest(parent);
 if(manifest.some(item=>item.sha===job.source_sha))throw new Error('This source is already part of this book.');
 const combined=parent.source_text+'\n\n'+source.text,offset=parent.source_text.split('\n').length+1;
 if(combined.length>limits.maxTextCharacters||new TextEncoder().encode(combined).length>limits.maxTextBytes)throw new Error('The combined book exceeds the current source capacity. Keep the added source as a separate book.');
 if(parent.chunks.length+source.chunks.length>limits.maxProcessingSections)throw new Error('The combined book has too many processing sections. Keep the added source as a separate book.');
 const chunks=source.chunks.map(chunk=>({...chunk,start:chunk.start+offset,end:chunk.end+offset,
  text:chunk.text.replace(/^(\d+): /gm,(_,line)=>`${Number(line)+offset}: `),
  sourceChapters:(chunk.sourceChapters||[]).map(ch=>({...ch,id:`r${job.revision}-${ch.id}`,startLine:ch.startLine+offset,endLine:ch.endLine+offset})),
  technicalReferences:(chunk.technicalReferences||[]).map(ref=>({...ref,startLine:ref.startLine+offset,endLine:ref.endLine+offset})),
 }));
 return {source_text:combined,chunks:[...parent.chunks,...chunks],cursor:parent.notes.length,
  notes:parent.notes,overview_notes:[],title:parent.title,author:parent.author,
  source_manifest:[...manifest,{...entry,sourceId:`S${manifest.length+1}`,startLine:offset+1,endLine:offset+source.lineCount}],
 };
}

export function skillSummary(artifacts) {
 const value={};
 const markdown=artifacts?.['book.md']||'';
 for(const [field,key] of [['oneLiner','one_liner'],['readIf','read_if'],['tags','tags']]){
  const match=markdown.match(new RegExp('^'+field+': (.+)$','m'));
  if(match)try{value[key]=JSON.parse(match[1]);}catch{}
 }
 const patterns=artifacts?.['skill/chapters/topics.md']||'';
 value.methods=[...patterns.matchAll(/^- \*\*(.+?)\*\*:/gm)].slice(0,24).map(m=>m[1]);
 return value;
}

export function libraryBook(job) {
 const {skill_summary,...metadata}=job;
 return {...metadata,...(skill_summary||{}),book_id:job.book_id||job.id,revision:job.revision||1,
  source_kind:'full-source',package_ready:job.status==='ready',
  scope_note:'Generated from the uploaded source. Extraction completeness and claims still require review.'};
}
