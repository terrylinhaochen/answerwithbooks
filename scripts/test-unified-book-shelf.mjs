import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const books=[['shoe-dog','Shoe Dog','Phil Knight'],['invention-a-life','Invention: A Life','James Dyson'],['open','Open','Andre Agassi']].map(([id,title,author])=>({id,title,author,status:'ready',stage:'ready',orientation:'A life explored through original passages.',coverUrl:`/covers/${id}.png`,coverColor:'#304c44',questions:[]}));
const privateBook={id:'private-excerpt',title:'The Wealth of Nations',author:'Adam Smith',status:'ready',source_name:'smith-book-i-chapters-1-3.txt',source_text_sha:'private-fixture',revision_kind:'base',skill_summary:{one_liner:'An existing private excerpt.'}};
const user={id:'shelf-fixture',aud:'authenticated',user_metadata:{}};
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:1000}});
  await context.addInitScript(user=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})),user);
  await context.route('https://*.supabase.co/**',async route=>{
   const url=new URL(route.request().url());let result=[];
   if(url.pathname.endsWith('/shared-library')){const body=route.request().postDataJSON();assert.ok(['mine','list'].includes(body.action));result=body.action==='mine'?{books}:{books:body.offset?books.slice(2):books.slice(0,2),nextOffset:body.offset?null:2};}
   else if(url.pathname.includes('/rest/v1/book_processing_jobs')){assert.equal(url.searchParams.get('visibility'),'eq.private');result=[privateBook];}
   else if(url.pathname.endsWith('/auth/v1/user'))result=user;
   await route.fulfill({json:result});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/books/',{waitUntil:'domcontentloaded'});
  const consent=page.getByRole('button',{name:'No thanks',exact:true});if(await consent.isVisible())await consent.click();
  assert.equal(await page.locator('[data-book-additions]').count(),0);
  assert.equal(await page.getByRole('heading',{name:'Your books',exact:true}).count(),0);
  await page.waitForFunction(()=>document.querySelectorAll('[data-shared-catalog-item]').length===3);
  assert.equal(await page.locator('[data-filter-list] [data-filter-item]:visible').count(),11);
  assert.equal(await page.locator('[data-filter-count]').innerText(),'49 books');
  assert.equal(await page.locator('[data-book-request-card]').count(),1);assert.equal(await page.getByRole('button',{name:'Find an excerpt',exact:true}).count(),0);
  await page.locator('[data-book-request-card] button').click();await page.locator('#book-upload-dialog[open]').waitFor();assert.match(await page.locator('#book-upload-dialog').innerText(),/Books and guides are public/);await page.keyboard.press('Escape');
  const search=page.locator('[data-filter-search]');await search.fill('Phil Knight');
  assert.equal(await page.locator('[data-filter-list] [data-filter-item]:visible').count(),1);
  assert.equal(await page.locator('[data-filter-list] [data-filter-item]:visible h3').innerText(),'Shoe Dog');
  await search.fill('');await page.locator('[data-pagination-next]').click();assert.equal(await page.locator('[data-filter-list] [data-filter-item]:visible').count(),12);await page.locator('[data-pagination-prev]').click();
  // A catalog refresh must not duplicate cards or reset the active search.
  await search.fill('Agassi');await page.evaluate(()=>dispatchEvent(new Event('awb:book-added')));await page.waitForTimeout(300);assert.equal(await page.locator('[data-shared-catalog-item]').count(),3);assert.equal(await search.inputValue(),'Agassi');assert.equal(await page.locator('[data-filter-list] [data-filter-item]:visible').count(),1);await search.fill('');
  await page.goto(origin+'/profile/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-book-additions-list] [data-shared-book-id="open"]').waitFor();
  assert.equal(await page.locator('[data-book-additions-list] article').count(),4);
  assert.equal(await page.getByRole('heading',{name:'Your books',exact:true}).count(),1);
  await page.locator('[data-book-additions]').scrollIntoViewIfNeeded();await page.locator('[data-book-additions] img').evaluateAll(imgs=>imgs.forEach(img=>img.loading='eager'));
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-book-additions] .jacket-art img')].every(img=>img.dataset.coverFitted==='true'));
  await page.locator('[data-book-additions]').screenshot({path:`/private/tmp/awb-unified-your-books-${width}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await context.close();
 }
 // An illustration originally in the bottom third must fit above the type.
 const page=await browser.newPage();await page.route('**/cover-layout-fixture.svg',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="150"><path fill="white" d="M0 0h100v150H0z"/><path fill="red" d="M10 95h80v45H10z"/></svg>'}));
 await page.goto(origin+'/books/',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{const jacket=document.createElement('div');jacket.id='cover-layout-fixture';jacket.className='jacket';jacket.style.cssText='width:200px;height:300px';jacket.innerHTML='<span class="jacket-face"><span class="jacket-art"><img crossorigin="anonymous" src="/cover-layout-fixture.svg" /></span><span class="jacket-type">Title and author</span></span>';document.body.append(jacket)});
 await page.waitForFunction(()=>document.querySelector('#cover-layout-fixture img').dataset.coverFitted==='true');
 const bounds=await page.locator('#cover-layout-fixture').evaluate(root=>{const art=root.querySelector('.jacket-art').getBoundingClientRect(),type=root.querySelector('.jacket-type').getBoundingClientRect(),img=root.querySelector('img').getBoundingClientRect();return {artTop:art.top,artBottom:art.bottom,typeTop:type.top,typeHeight:type.height,diagramTop:img.top+img.height*95/150,diagramBottom:img.top+img.height*140/150}});
 assert.ok(bounds.diagramTop>bounds.artTop);assert.ok(bounds.diagramBottom<bounds.artBottom-5);assert.equal(bounds.artBottom,bounds.typeTop);assert.equal(bounds.typeHeight,120);
 assert.deepEqual(errors,[]);console.log('PASS unified personal/public shelves, private excerpt preserved, paginated shared catalog, search and refresh, desktop/mobile covers, and protected 40% title panel.');
}finally{await browser.close()}
