import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {printAnswerMarkup} from '../src/lib/print-study.mjs';
import manifest from '../src/data/rendered-covers.json' with {type:'json'};
const pages=[];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(item.name==='index.html')pages.push(fs.readFileSync(file,'utf8'));}}
walk('dist');
let count=0;
for(const [source,cover] of Object.entries(manifest)){
 assert.ok(cover.caption.trim(),source+' has typeset title text');
 const file=fs.readFileSync(path.join('public',cover.src)),meta=await sharp(file).metadata();
 assert.equal(meta.width,cover.width);assert.equal(meta.height,cover.height);
 assert.ok(cover.src.includes(createHash('sha256').update(file).digest('hex').slice(0,12)),'URL fingerprints final pixels');
 const visible=pages.filter(html=>html.includes(`src="${cover.src}"`));
 const slug=path.basename(source,path.extname(source));
 const alternate=source.startsWith('/covers/')?`/print-study/${slug}-grain.png`:printAnswerMarkup(slug)?.match(/src="([^"]+)"/)?.[1];
 assert.ok(visible.length||(alternate&&pages.some(html=>html.includes(`src="${alternate}"`))),source+' has a visible cover or approved print replacement');
 if(!visible.length)assert.ok(fs.statSync(path.join('dist',alternate)).size>0,'Print replacement ships with the page');
 assert.ok(pages.some(html=>html.includes(`property="og:image" content="https://answerwithbooks.com${cover.src}"`)),source+' used by sharing metadata');
 for(const html of visible)assert.ok(!html.includes(`src="${source}"`),source+' must not remain a background-only image on the page');
 assert.deepEqual(fs.readFileSync(path.join('dist',cover.src)),file,'Published file matches the verified image');
 count++;
}
for(const kind of ['books','answers'])for(const file of fs.readdirSync(`src/content/${kind}`).filter(f=>f.endsWith('.md'))){
 const html=fs.readFileSync(`dist/${kind}/${file.slice(0,-3)}/index.html`,'utf8');
 const image=html.match(/property="og:image" content="([^"]+)"/)?.[1];assert.ok(image?.includes('/rendered/'),file+' complete cover required');
 const structured=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('');assert.ok(structured.includes(image),file+' structured data points to complete cover');
}
console.log(`Complete-cover checks passed: ${count} images, dimensions, fingerprints, visible sources, social metadata, structured data and built files.`);
