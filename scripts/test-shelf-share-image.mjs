import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const errors=[];
async function pageAt(width) {
 const page=await browser.newPage({viewport:{width,height:950}});
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const observer=new MutationObserver(()=>{const card=document.querySelector('.shelf-export-card');if(card)window.exportText=card.textContent;});
  observer.observe(document,{subtree:true,childList:true});
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}});
 });
 return page;
}
async function makeImage(page) {
 await page.locator('[data-create-shelf-image]').click();
 await page.locator('[data-shelf-image-preview]:visible').waitFor();
 await page.waitForFunction(()=>document.querySelector('[data-shelf-image-preview]').naturalWidth===2400);
 assert.equal(await page.locator('[data-shelf-image-preview]').evaluate(img=>img.naturalHeight),1500);
 const pixels=await page.locator('[data-shelf-image-preview]').evaluate(img=>{
  const canvas=document.createElement('canvas');canvas.width=120;canvas.height=75;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,120,75);
  const data=ctx.getImageData(0,0,120,75).data;let opaque=0,colored=0;
  for(let i=0;i<data.length;i+=4){if(data[i+3]===255)opaque++;if(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>70)colored++;}
  return {opaque,colored};
 });
 assert.equal(pixels.opaque,9000,'Export includes the full card background');assert.ok(pixels.colored>150,'Export includes the rendered cover art, not an empty image');
}
try {
 for(const width of [1440,390,320]) {
  const page=await pageAt(width);await page.goto(origin);await page.locator('[data-share-shelf]:enabled').click();
  const input=await page.locator('[data-shelf-share-url]').boundingBox(), copy=await page.locator('[data-copy-shelf-link]').boundingBox();
  assert.ok(copy.x>=input.x+input.width,'Copy is beside URL');assert.ok(Math.abs(copy.y-input.y)<2);assert.ok(copy.width<120);
  await page.locator('[data-copy-shelf-link]').click();assert.equal(await page.evaluate(()=>window.copied),await page.locator('[data-shelf-share-url]').inputValue());
  await page.screenshot({path:`/private/tmp/awb-share-image-before-${width}.png`});
  await makeImage(page);assert.match(await page.evaluate(()=>window.exportText),/Your collection, ready for your next question or task/);assert.match(await page.evaluate(()=>window.exportText),/Agent Skills for Books/);assert.doesNotMatch(await page.evaluate(()=>window.exportText),/Good books travel|Answer with Books/);assert.equal(await page.locator('[data-share-shelf-image]').isVisible(),false);
  const download=page.waitForEvent('download');await page.locator('[data-download-shelf-image]').click();const file=await download;
  assert.equal(file.suggestedFilename(),'answer-with-books-shelf.png');const path=`/private/tmp/awb-shelf-card-${width}.png`;await file.saveAs(path);
  const png=await readFile(path);assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),2400);assert.equal(png.readUInt32BE(20),1500);assert.ok(png.length>10000);
  await page.screenshot({path:`/private/tmp/awb-share-image-ready-${width}.png`});
  assert.ok(await page.locator('[data-shelf-share-dialog]').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  const blobUrl=await page.locator('[data-download-shelf-image]').getAttribute('href');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>document.body.style.overflow==='');
  assert.equal(await page.evaluate(url=>fetch(url).then(()=>true,()=>false),blobUrl),false,'Closing releases generated image');
  await page.locator('[data-share-shelf]').click();assert.equal(await page.locator('[data-create-shelf-image]').isVisible(),true);assert.equal(await page.locator('[data-shelf-image-preview]').isVisible(),false);
  await page.close();console.log(`PASS ${width}: inline link copy, actual 2400x1500 PNG download, mobile layout, and export reset.`);
 }
 const personal=await pageAt(390);
 const user={id:'00000000-0000-4000-8000-000000000077',email:'private@example.test',aud:'authenticated',role:'authenticated',user_metadata:{first_name:'Terry'}};
 const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const session={access_token:`${enc({alg:'none',typ:'JWT'})}.${enc({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.mock`,refresh_token:'mock',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
 await personal.addInitScript(value=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify(value)),session);
 await personal.route('https://*.supabase.co/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(new URL(route.request().url()).pathname==='/auth/v1/user'?user:[])}));
 await personal.goto(origin);await personal.locator('[data-personal-shelf-heading]:visible').waitFor();await personal.locator('[data-share-shelf]:enabled').click();
 assert.equal(await personal.locator('#shelf-share-title').innerText(),'Terry’s shelf');
 await makeImage(personal);const text=await personal.evaluate(()=>window.exportText);assert.match(text,/Terry’s shelf/);assert.ok(text.includes(await personal.locator('[data-shelf-date]').innerText()));assert.doesNotMatch(await personal.locator('[data-shelf-share-url]').inputValue(),/terry|private/i);
 const exported=personal.waitForEvent('download');await personal.locator('[data-download-shelf-image]').click();await (await exported).saveAs('/private/tmp/awb-terrys-rendered-shelf.png');await personal.close();
 console.log('PASS authenticated shelf name and date in the rendered export, requested copy, single branding label, and no account data in URL. Auth mocked.');
 const page=await pageAt(390);const url=`${origin}/shelf/?books=the-mom-test,atomic-habits`;
 await page.goto(url);await page.locator('[data-reshare-shelf]').click();
 await page.evaluate(()=>{
  Object.defineProperty(navigator,'canShare',{configurable:true,value:({files})=>files[0].type==='image/png'});
  Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.shared={url:data.url,name:data.files[0].name,type:data.files[0].type,size:data.files[0].size};}});
 });
 await makeImage(page);assert.equal(await page.locator('[data-download-shelf-image]').isVisible(),true);
 await page.locator('[data-share-shelf-image]').click();const shared=await page.evaluate(()=>window.shared);
 assert.equal(shared.url,url);assert.equal(shared.type,'image/png');assert.equal(shared.name,'answer-with-books-shelf.png');assert.ok(shared.size>10000);
 await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Cancelled','AbortError');}}));
 await page.locator('[data-share-shelf-image]').click();assert.equal(await page.locator('[data-shelf-image-status]').innerText(),'');
 await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new Error('Not available');}}));
 await page.locator('[data-share-shelf-image]').click();assert.match(await page.locator('[data-shelf-image-status]').innerText(),/Download the image or copy the link/);
 console.log('PASS native-share payload includes the PNG and exact shelf URL; cancel is quiet and failure keeps download available. Native OS share menu mocked.');
 await page.goto(`${origin}/shelf/?books=the-mom-test`);await page.locator('[data-reshare-shelf]').click();
 await page.route('**/covers/the-mom-test.jpg',route=>route.fulfill({status:404,body:'missing'}));
 await page.locator('[data-create-shelf-image]').click();await page.getByText('Couldn’t create the image. Please try again.',{exact:true}).waitFor();assert.equal(await page.locator('[data-create-shelf-image]').isEnabled(),true);assert.equal(await page.locator('[data-download-shelf-image]').isVisible(),false);
 await page.unroute('**/covers/the-mom-test.jpg');await makeImage(page);
 const one=page.waitForEvent('download');await page.locator('[data-download-shelf-image]').click();await (await one).saveAs('/private/tmp/awb-shelf-card-one.png');
 await page.keyboard.press('Escape');await page.locator('[data-reshare-shelf]').click();
 await page.evaluate(()=>{
  const original=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(callback,...rest){window.finishImage=()=>original.call(this,blob=>{callback(blob);window.imageFinished=true;},...rest);};
 });
 await page.locator('[data-create-shelf-image]').click();await page.waitForFunction(()=>typeof window.finishImage==='function');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[data-shelf-share-dialog]').open);
 await page.evaluate(()=>window.finishImage());await page.waitForFunction(()=>window.imageFinished);
 assert.equal(await page.locator('[data-download-shelf-image]').getAttribute('href'),null);assert.equal(await page.locator('[data-shelf-image-preview]').isVisible(),false);
 assert.deepEqual(errors,[]);await page.close();console.log('PASS one-book export, failed cover load/retry, close during generation, and no page errors.');
} finally {await browser.close();}
