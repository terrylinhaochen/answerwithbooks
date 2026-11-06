import {chromium} from 'playwright';import {build} from 'esbuild';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const code=(await build({entryPoints:['src/lib/book-file-hash.ts'],bundle:true,write:false,format:'iife',globalName:'bookHash'})).outputFiles[0].text;
const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4321/books/');
 await page.locator('[data-open-book-request]').first().click();assert.match(await page.locator('#book-upload-dialog').innerText(),/500 MB each/);
 await page.addScriptTag({content:code});
 const actual=await page.evaluate(async()=>{let largest=0;const bytes=500*1024*1024;const file={size:bytes,slice(start,end){const length=Math.min(end,bytes)-start;largest=Math.max(largest,length);return{async arrayBuffer(){return new Uint8Array(length).fill(65).buffer;}};}};return {sha:await bookHash.hashBookFile(file),largest};});
 const h=createHash('sha256'),block=Buffer.alloc(4*1024*1024,65);for(let i=0;i<125;i++)h.update(block);
 assert.equal(actual.sha,h.digest('hex'));assert.equal(actual.largest,4*1024*1024);
 console.log('PASS browser 500 MB fingerprint in 4 MB pieces and 500 MB upload label');
}finally{await browser.close();}
