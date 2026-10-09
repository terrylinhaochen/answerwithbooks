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
