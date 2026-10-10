import test from 'node:test';
import assert from 'node:assert/strict';
import {bookStatus,bookSourceLabel,groupBookUploads} from '../src/lib/book-library-status.mjs';
test('ready text never implies a ready cover and terminal errors stay visible',()=>{
 for(const cover_status of ['none','skipped',undefined])assert.equal(bookStatus({status:'ready',cover_status}),'Book and skill ready');
 assert.match(bookStatus({status:'ready',cover_status:'failed'}),/Cover needs a retry/);
 assert.match(bookStatus({status:'ready',cover_status:'pending'}),/Creating cover/);
 assert.equal(bookStatus({status:'ready',cover_status:'ready',cover_path:'private/cover.png'}),'Book, skill, and cover ready');
 assert.equal(bookStatus({run_state:'failed',error:'Source review failed'}),'Source review failed');
 assert.match(bookStatus({run_state:'queued',cursor:117,total_sections:117}),/Assembling/);
 assert.match(bookStatus({run_state:'queued',cursor:40,total_sections:117}),/40 of 117/);
});
test('source labels distinguish the benchmark without guessing completeness',()=>{
 assert.match(bookSourceLabel({source_name:'smith-book-i-chapters-1-3.txt',total_sections:4}),/^Excerpt · Chapters 1–3/);
 assert.equal(bookSourceLabel({source_name:'wealth.epub',total_sections:117,source_line_count:35100}),'Uploaded source · 117 processing sections · 35,100 source lines');
});
test('group only equal extracted content and prefer a completed result, preserving every upload',()=>{
 const jobs=[{id:'failed',revision_kind:'base',source_text_sha:'same',run_state:'failed'},{id:'ready',revision_kind:'base',source_text_sha:'same',status:'ready'},{id:'excerpt',revision_kind:'base',source_text_sha:'excerpt'},{id:'revision',revision_kind:'replace',source_text_sha:'same'},{id:'staging',revision_kind:'base'}];
 const groups=groupBookUploads(jobs);assert.equal(groups.length,4);assert.equal(groups[0].primary.id,'ready');assert.deepEqual(groups[0].copies.map(j=>j.id),['failed']);
 assert.equal(groups.reduce((n,g)=>n+1+g.copies.length,0),5);
});

test('public and private covers share art direction, title panel, and safe jacket markup',async()=>{
 const {imagePrompt,coverPalette}=await import('../supabase/functions/_shared/book-cover-design.mjs');
 const {bookJacketMarkup}=await import('../src/lib/book-jacket.mjs');
 const full={title:'An Inquiry into the Nature and Causes of the Wealth of Nations',author:'Adam Smith',oneLiner:'Specialization and exchange.'};
 const excerpt={title:'The Wealth of Nations',author:'Adam Smith',oneLiner:'Specialization and exchange.'};
 assert.equal(imagePrompt(full),imagePrompt(excerpt));assert.deepEqual(coverPalette(full),coverPalette(excerpt));
 assert.match(imagePrompt(full),/large sticker emblem/);assert.match(imagePrompt(full),/upper 56%/);assert.match(imagePrompt(full),/no book title/);
 const markup=bookJacketMarkup({...full,color:coverPalette(full).bg,coverAsset:'/covers/test.png'});
 for(const part of ['jacket-spine','jacket-art','jacket-type','jacket-title','jacket-author','jacket--very-long'])assert.ok(markup.includes(part));
 assert.match(markup,/Adam Smith/);
 const hostile=bookJacketMarkup({title:'<img src=x onerror=alert(1)>',author:'A&B',color:'red;bad:1',coverAsset:'javascript:alert(1)'});
 assert.doesNotMatch(hostile,/<img/);assert.match(hostile,/&lt;img/);assert.match(hostile,/A&amp;B/);assert.doesNotMatch(hostile,/bad:1|javascript:/);
});

test('reader overview excludes exhaustive notes and agent instructions without discarding references',async()=>{
 const {bookReadingSections,readingOverviewWords}=await import('../src/lib/private-book-reading.mjs');
 const parts=bookReadingSections('---\ntitle: "Example"\n---\n\n## Central argument\n\nA short argument.\n\n## Core lessons\n\n### One\n\nDetailed lesson.\n\n## Key frameworks\n\n### Method\n\nDetailed steps.\n\n## Source and coverage\n\nPrivate references.\n\n## Use this book in an agent\n\nSkill instructions.');
 assert.deepEqual(parts.map(part=>part.title),['Central argument','Core lessons','Key frameworks']);
 assert.equal(readingOverviewWords(parts),3);assert.equal(parts.filter(part=>part.detailed).length,2);assert.match(parts[1].text,/Detailed lesson/);assert.match(parts[2].text,/Detailed steps/);
});
