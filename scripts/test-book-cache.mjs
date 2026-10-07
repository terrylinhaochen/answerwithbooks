import assert from 'node:assert/strict';
import {test} from 'node:test';
import {matchLibraryFile} from '../src/lib/library-match.mjs';
import {reusableBook,cachedBookSummary} from '../supabase/functions/_shared/book-cache.mjs';
const books=[{slug:'the-mom-test',title:'The Mom Test',author:'Rob Fitzpatrick'},{slug:'focus',title:'Focus',author:'Author One'},{slug:'focus-two',title:'Focus',author:'Author Two'}];
test('public title suggestions are exact, local, and unambiguous',()=>{
 for(const name of ['The Mom Test.pdf','The_Mom_Test.epub','Rob Fitzpatrick - The Mom Test.pdf','The Mom Test - Rob Fitzpatrick.md'])assert.equal(matchLibraryFile(name,books)?.slug,'the-mom-test');
 for(const name of ['My notes on The Mom Test.pdf','Focus.pdf','Mom test.pdf','The Mom Test workbook.pdf','The Mom Test - Someone Else.pdf'])assert.equal(matchLibraryFile(name,books),null,name);
 assert.equal(matchLibraryFile('Focus - Author Two.pdf',books)?.slug,'focus-two');
});
test('saved books retain progress; incomplete intake resumes rather than becoming a false cache hit',()=>{
 assert.equal(reusableBook(null),false);
 for(const run_state of ['staging','manual','paused','failed'])assert.equal(reusableBook({status:'uploaded',run_state}),false);
 assert.equal(reusableBook({status:'uploaded',run_state:'queued'}),true);
 for(const status of ['ready','analyzed','cover','processing','failed'])assert.equal(reusableBook({status,run_state:'paused'}),true);
 assert.deepEqual(cachedBookSummary({id:'id',title:'Private title',status:'ready',run_state:'complete',source_text:'private',artifacts:{},source_sha:'hash'}),{id:'id',title:'Private title',status:'ready',run_state:'complete'});
});
