import test from 'node:test';
import assert from 'node:assert/strict';
import {finalizeBookSource,sourceManifest,skillSummary,libraryBook} from '../supabase/functions/_shared/book-revisions.mjs';
import {splitSource,validateSection} from '../supabase/functions/_shared/book-sections.mjs';
import {exportBookFiles} from '../supabase/functions/_shared/book-export.mjs';
const first='Chapter 1: Evidence\n'+('Record a prediction. Preserve uncertainty.\n'.repeat(8));
const second='Chapter 2: Review\n'+('Compare the result to the prediction before expanding.\n'.repeat(8));
const base={id:'a',book_id:'book',user_id:'owner',source_name:'original.md',source_sha:'a'.repeat(64),title:'Evidence',author:'Editor',status:'ready'};
const prepared=finalizeBookSource(base,first,[{line:1,title:'Chapter 1: Evidence'}]);
const parent={...base,...prepared,notes:[{id:'ch01',summary:'Keep uncertainty.',sourceRefs:[{startLine:2,endLine:3}],ideas:[]}]};
const revision={...base,id:'b',source_name:'more.md',source_sha:'b'.repeat(64),parent_job_id:'a',revision:2,revision_kind:'append'};
test('append preserves original citations and notes, and maps new source coordinates',()=>{
 const value=finalizeBookSource(revision,second,[{line:1,title:'Chapter 2: Review'}],parent);
 assert.equal(value.source_text,first+'\n\n'+second);
 assert.deepEqual(value.notes,parent.notes);assert.equal(value.cursor,1);
 assert.equal(value.chunks[1].start,first.split('\n').length+2);
 assert.match(value.chunks[1].text,new RegExp('^'+value.chunks[1].start+': Chapter 2'));
 assert.equal(value.source_manifest[1].startLine,value.chunks[1].start);
 assert.equal(value.source_text.split('\n')[value.source_manifest[1].startLine-1],'Chapter 2: Review');
 assert.equal(value.chunks[1].sourceChapters[0].startLine,value.chunks[1].start);
 assert.equal(value.source_manifest[0].jobId,parent.id);
});
test('replacement is independent; mismatched ownership and duplicate append fail before mutation',()=>{
 const value=finalizeBookSource({...revision,revision_kind:'replace'},second,[],parent);
 assert.equal(value.source_text,second);assert.equal(value.cursor,0);assert.deepEqual(value.notes,[]);
 assert.throws(()=>finalizeBookSource(revision,second,[],{...parent,user_id:'stranger'}),/prior revision/);
 assert.throws(()=>finalizeBookSource({...revision,source_sha:parent.source_sha},second,[],parent),/already part/);
 assert.equal(parent.source_text,first);
});
test('large chapter splits retain original labels across all processing sections',()=>{
 const text='Chapter 1: Evidence\n'+('Evidence. '.repeat(9000))+'\nChapter 2: Review\n'+'Review. '.repeat(9000);
 const normalized=splitSource(text).text,lines=normalized.split('\n');
 const result=splitSource(normalized,[{line:1,title:lines[0]},{line:lines.indexOf('Chapter 2: Review')+1,title:'Chapter 2: Review'}]);
 assert.ok(result.chunks.length>4);assert.equal(result.chapterMap.length,2);
 assert.ok(result.chunks.every(c=>c.sourceChapters.length));
 assert.ok(result.chunks.filter(c=>c.sourceChapters.some(ch=>ch.id==='chapter-1')).length>1);
 assert.equal(result.chunks.at(-1).end,lines.length);
});
test('technical source blocks remain byte-identical and are never model reconstructions',()=>{
 const text='Chapter 1: API\n```python\nprint("source")\n```\n\n| Input | Output |\n| --- | --- |\n| 1 | 2 |\n\n$$x = y + 1$$\n'+first;
 const {chunks}=splitSource(text);
 const chunk=chunks[0];assert.deepEqual(chunk.technicalReferences.map(r=>r.kind),['code','table','equation']);
 const note=validateSection({summary:'Use the shown API.',sourceRefs:[{startLine:1,endLine:1}],ideas:[]},chunk,0);
 assert.deepEqual(note.technicalReferences,chunk.technicalReferences);
 for(const ref of note.technicalReferences)assert.equal(ref.text,text.split('\n').slice(ref.startLine-1,ref.endLine).join('\n'));
});
test('download keeps discovery text and exports stable package identity with source map',()=>{
 const artifacts={'skill/SKILL.md':'---\nname: old\ndescription: "Use bounded trials for reversible decisions."\n---\n# Evidence\n','book.md':'---\noneLiner: "Compare evidence."\nreadIf: "You face reversible choices."\ntags: ["decisions"]\n---\n','quality-review.json':'{"version":2}'};
 const job={...parent,artifacts,revision:3};const files=exportBookFiles(job);
 assert.match(files['skill/SKILL.md'],/description: "Use bounded trials/);
 assert.deepEqual(JSON.parse(files['skill/package.json']).bookId,'book');
 assert.equal(JSON.parse(files['skill/package.json']).revision,3);
 assert.equal(files['skill/source.txt'],first);
 assert.equal(JSON.parse(files['skill/source-map.json']).sources[0].endLine,first.split('\n').length);
 assert.equal(skillSummary(artifacts).read_if,'You face reversible choices.');
 assert.equal(libraryBook({...base,skill_summary:skillSummary(artifacts)}).read_if,'You face reversible choices.');
 assert.equal(sourceManifest(parent)[0].sha,parent.source_sha);
});
test('export preserves exact technical blocks after source verification',()=>{
 const technical='```python\n# ## comment\npath = "private source.txt"\n```\n';
 const artifacts={'skill/SKILL.md':'---\nname: evidence\ndescription: Apply evidence.\n---\n# Evidence\n','book.md':'# Evidence','skill/chapters/ch01.md':technical};
 const old=exportBookFiles({...parent,artifacts});assert.equal(old['skill/chapters/ch01.md'],technical);
 artifacts['skill/chapters/source-map.md']='# Source map\n';
 artifacts['skill/chapters/ch01.md']+='\n## Technical source references\n\n$$\n# ## exact source equation\n$$\n';
 const current=exportBookFiles({...parent,artifacts});assert.equal(current['skill/chapters/ch01.md'],artifacts['skill/chapters/ch01.md']);
});
