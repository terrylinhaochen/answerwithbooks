const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const books=[{id:'a',title:'First book',author:'First author',visibility:'public'},{id:'b',title:'Second book',author:'Second author',visibility:'public'}];
  const sections=['a','a','b','a'].map((bookId,i)=>({...books.find(b=>b.id===bookId),bookId,heading:`Part ${i+1}`,before:'Editorial context.',text:`Original passage ${i+1}.`,after:'Editorial continuation.',startLine:10+i*10,endLine:19+i*10,words:10}));
  let fail=false;
  await context.route('**/functions/v1/reading-guides',route=>{
   const {action}=route.request().postDataJSON();
   if(action==='public-list')return route.fulfill(fail?{status:503,json:{error:'Unavailable'}}:{json:{guides:[{id:'new',question:'Today’s guide',created_at:'2026-11-06T08:00:00Z',book_ids:['a']},{id:'old',question:'Old guide',created_at:'2026-11-06T07:59:59Z',book_ids:['a']}]}});
   if(action==='get')return route.fulfill({json:{guide:{id:'new',question:'Today’s guide',created_at:'2026-11-06T08:00:00Z',visibility:'public',status:'ready',book_ids:['a','b'],guide:{minutes:10,originalWords:40,introduction:'Introduction.',sections,conclusion:'Conclusion.'}},books}});
   throw Error(`Unexpected ${action}`);
  });
  await page.goto('http://127.0.0.1:4321/guides/');
  await page.locator('#all-guides h3').waitFor();
  assert.equal(await page.locator('#all-guides h3').count(),1);
  assert.equal(await page.locator('#all-guides h3').innerText(),'Today’s guide');
  assert.equal(await page.getByText('From the shared library',{exact:true}).count(),0);
  assert.equal(await page.locator('[data-featured-guides],a[href^="/answers/"],a[href^="/guides/how-to-"]').count(),0);
  fail=true;await page.reload();await page.getByText('Could not load guides.',{exact:true}).waitFor();
  fail=false;await page.locator('#all-guides').getByRole('button',{name:'Try again'}).click();await page.locator('#all-guides h3').waitFor();
  await page.goto('http://127.0.0.1:4321/guides/read/?id=new');await page.locator('.original').first().waitFor();
  assert.equal(await page.locator('.original').count(),4);assert.equal(await page.locator('.excerpt-source-card').count(),3);
  assert.deepEqual(await page.locator('.excerpt-source-card').evaluateAll(cards=>cards.map(card=>card.nextElementSibling.className)),['original','original','original']);
  assert.equal(await page.locator('#reading-1 .excerpt-source-card').count(),0);
  assert.equal(await page.locator('#reading-3 .excerpt-source-card').count(),1,'Returning to a book identifies the source again');
  assert.equal(await page.locator('#reading-0 .excerpt-source-location').innerText(),'Original text · 2 passages');
  assert.equal(await page.locator('#reading-0 .excerpt-source-location').getAttribute('title'),'lines 10–19; lines 20–29');
  assert.equal(await page.locator('#reading-1 .original').getAttribute('data-source-start'),'20');
  assert.equal(await page.locator('.original').first().innerText(),'Original passage 1.');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);
  console.log('PASS unified catalog, date boundary, legacy removal, public retry, book-run source cards, unchanged originals, preserved references, mobile fit.');
  await context.close();
  const live=await browser.newPage({viewport:{width:1280,height:900}});
  await live.goto('http://127.0.0.1:4321/guides/');await live.locator('[data-public-guides][aria-busy=false]').waitFor({timeout:30000});
  console.log('Live All guides:',await live.locator('#all-guides h3').allTextContents());
  await live.goto('http://127.0.0.1:4321/guides/read/?id=f4d44ec6-118a-4ec7-8b1b-17824b2e243e');await live.locator('.original').first().waitFor({timeout:30000});
  console.log('Live guide:',JSON.stringify({passages:await live.locator('.original').count(),sourceCards:await live.locator('.excerpt-source-card').count(),sources:await live.locator('.excerpt-source-copy').allTextContents()}));
  await live.locator('#reading-0').scrollIntoViewIfNeeded();await live.screenshot({path:'/private/tmp/awb-source-runs.jpg',type:'jpeg',quality:55,timeout:5000});
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
