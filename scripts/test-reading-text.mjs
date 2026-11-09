import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {readableSourceText} from '../supabase/functions/_shared/reading-text.mjs';
import {hydrateReading} from '../supabase/functions/_shared/reading-guides.mjs';
const sha='cb61b767c8cd576f2aab0b9769638f2d12bbd85a0ffbd800d50948d1a7dbbd94';
const original='change and competition intensi es. We miss a huge opportunity by not';
test('verified edition and exact line bytes repair missing glyphs, never general spelling',()=>{
 assert.equal(readableSourceText(original,{source_sha:sha},6814),'change and competition intensifies. We miss a huge opportunity by not');
 assert.equal(readableSourceText(original,{source_sha:'another-edition'},6814),original);
 assert.equal(readableSourceText(original,{source_sha:sha},6815),original);
 assert.equal(readableSourceText(original+' changed',{source_sha:sha},6814),original+' changed');
 assert.equal(readableSourceText('An intentional misspeling and a ﬁligree.',{},1),'An intentional misspeling and a filigree.');
});
test('legacy source hashes and line references survive a display repair',async()=>{
 const hash=async bytes=>createHash('sha256').update(bytes).digest('hex');
 const textSha=await hash(Buffer.from(original));
 const book={id:'book',source_sha:sha,source_text:'\n'.repeat(6813)+original};
 const guide={introduction:'Before',conclusion:'After',sections:[{bookId:'book',startLine:6814,endLine:6814,textSha,before:'',after:''}]};
 const hydrated=await hydrateReading(guide,[book],hash);
 assert.equal(hydrated.sections[0].textSha,textSha);assert.equal(hydrated.sections[0].startLine,6814);
 assert.ok(hydrated.sections[0].text.includes('intensifies'));assert.ok(book.source_text.includes('intensi es'));
 await assert.rejects(hydrateReading(guide,[{...book,source_text:book.source_text+' changed'}],hash),/edition changed/);
});

test('Green edition restores verified fi and fl glyphs without changing other editions',()=>{
 const sha='fc7fa792e31230ac49c66b5036e9e2a0b620f47773610d77fc3dc32e570be63c';
 const examples=[[1900,'terrible times. In 1951, he and his rst wife, Judith, were on vacation in','first wife'],[1910,'of exploring scienti cally whether spiritual practices such as prayer or','scientifically'],[1911,'forgiveness might be bene cial. I’m embarrassed to admit it, but my prejudices','beneficial'],[1925,'are re ections of what is happening within us.” Templeton took control of his','reflections'],[1927,'which made me less open to learning from him. But twenty years later, I nd','I find']];
 for(const [line,text,fixed] of examples){assert.ok(readableSourceText(text,{source_sha:sha},line).includes(fixed));assert.equal(readableSourceText(text,{source_sha:'different'},line),text);}
});
