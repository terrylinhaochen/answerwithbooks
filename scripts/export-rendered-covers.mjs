// Render the actual cover components to standalone JPEGs, including their typography.
// Run npm run covers:export; the first build deliberately ignores the export manifest.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import sharp from 'sharp';
const root=process.cwd(),dist=path.join(root,'dist');
const manifest={};
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const pathname=decodeURIComponent(url.pathname);const file=path.resolve(dist,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!file.startsWith(dist+path.sep))throw Error('Invalid path');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{channel:process.env.CI?undefined:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:1280,height:1000},deviceScaleFactor:2});
 // No application scripts, analytics, account calls or image-model calls during export.
 await context.route('**/*',route=>route.request().resourceType()==='script'?route.abort():route.continue());
 const page=await context.newPage();
 for(const [collection,selector] of [['books','.jacket'],['answers','.answer-cover'],['guides','.guide-cover']]){
  for(const slug of (await fs.readdir(path.join(dist,collection))).sort()){
   try{await fs.access(path.join(dist,collection,slug,'index.html'));}catch{continue;}
   await page.goto(`${origin}/${collection}/${slug}/`,{waitUntil:'load'});
   const cover=page.locator(selector).first();if(!await cover.count())continue;
   const source=await cover.locator('img').first().getAttribute('src');if(!source||manifest[source])continue;
   if(source.includes('/rendered/'))throw Error('Export requires a build with AWB_EXPORT_COVERS=1');
   const isBook=collection==='books';
   await page.evaluate(async({selector,isBook})=>{
    const target=document.querySelector(selector);document.body.replaceChildren(target);document.body.style.cssText='margin:0;padding:0;background:white;overflow:visible';
    const style=document.createElement('style');style.textContent=`body>${selector}{position:relative!important;display:block!important;width:${isBook?600:600}px!important;height:${isBook?900:337.5}px!important;margin:0!important;border:0!important;border-radius:0!important;transform:none!important;box-shadow:none!important;transition:none!important} .jacket-face{transform:none!important;border-radius:0!important} .jacket-back,.jacket-spine,.jacket-pages,.jacket-page-top,.jacket-page-bottom,.jacket-board-edge,.jacket-board-foot{display:none!important}`;document.head.append(style);
    for(const img of target.querySelectorAll('img')){img.loading='eager';await img.decode();}
    await document.fonts.load('400 48px Newsreader');await document.fonts.load('400 16px Inter');await document.fonts.ready;
    if(![...document.fonts].some(font=>font.family==='Newsreader'&&font.status==='loaded'))throw Error('Cover font did not load');
    const title=target.querySelector('.jacket-title');const author=target.querySelector('.jacket-author');
    if(title&&author&&title.getBoundingClientRect().bottom>author.getBoundingClientRect().top)throw Error('Title overlaps author');
   },{selector,isBook});
   const caption=await cover.locator(isBook?'.jacket-type':collection==='answers'?'.answer-cover__label':'.guide-cover__label').textContent().catch(()=> '');
   const capture=await (isBook?cover.locator('.jacket-face'):cover).screenshot({type:'png',animations:'disabled'});
   // Chromium rounds half CSS pixels; normalize the final export to exact dimensions.
   const bytes=await sharp(capture).resize(1200,isBook?1800:675,{fit:'fill'}).jpeg({quality:92}).toBuffer();
   const hash=createHash('sha256').update(bytes).digest('hex').slice(0,12);
   const src=`${path.posix.dirname(source)}/rendered/${slug}.${hash}.jpg`;await fs.mkdir(path.join(root,'public',path.posix.dirname(src)),{recursive:true});await fs.writeFile(path.join(root,'public',src),bytes);
   manifest[source]={src,width:1200,height:isBook?1800:675,caption:caption.trim()};
   console.log(`${collection}/${slug}: exported with type`);
  }
 }
 await fs.writeFile(path.join(root,'src/data/rendered-covers.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(`Exported ${Object.keys(manifest).length} complete covers. Rebuild to use them.`);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
