import test from 'node:test';
import assert from 'node:assert/strict';
import {needsStructuredPdf} from '../src/lib/pdf-processing-route.mjs';
const item=(str,x,y,width=str.length*6,fontName='body')=>({str,transform:[12,0,0,12,x,y],height:12,width,fontName});
const content=items=>({items,styles:{body:{fontFamily:'sans-serif'},code:{fontFamily:'monospace'}}});
test('plain prose, headers and isolated short labels stay on the fast path',()=>{
 assert.equal(needsStructuredPdf(content([item('Chapter 1: The next decision',50,740),item('Use a bounded trial. Keep observations and assumptions separate.',50,720),item('Compare the result before changing the plan.',50,700)])),false);
 assert.equal(needsStructuredPdf(content([item('Title',50,740),item('Page 3',420,740)])),false);
});
test('tagged tables and formulas select structured reading, including nested tags',()=>{
 for(const role of ['Table','Formula','Code'])assert.equal(needsStructuredPdf(content([]),{role:'Document',children:[{role:'Sect',children:[{role}]}]}),true);
});
test('compact aligned table rows select structured reading',()=>{
 assert.equal(needsStructuredPdf(content(['Method|Outcome','Bounded trial|Compare evidence','Review|Choose next action'].flatMap((row,i)=>row.split('|').map((cell,j)=>item(cell,50+j*220,650-i*30))))),true);
});
test('long two-column prose and separated page furniture do not become a table',()=>{
 const prose='Keep observations and assumptions separate before making a choice.';
 assert.equal(needsStructuredPdf(content([0,1,2].flatMap(i=>[item(prose,50,740-i*18,300),item(prose,390,740-i*18,300)]))),false);
 assert.equal(needsStructuredPdf(content([0,1,2].flatMap(i=>[item('Label',50,740-i*200),item('Detail',390,740-i*200)]))),false);
});
test('code snippets and display equations select structured reading',()=>{
 assert.equal(needsStructuredPdf(content([item('def squared(value):',50,500,170,'code'),item('    return value ** 2',50,482,170,'code')])),true);
 for(const formula of ['E = m c','∫ f(x) dx','x ≤ 2','x² + y² = r²'])assert.equal(needsStructuredPdf(content([item(formula,180,450)])),true,formula);
 assert.equal(needsStructuredPdf(content([item('The function returns a useful decision.',50,500)])),false);
});
