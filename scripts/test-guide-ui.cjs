// Local browser fixture. All guide requests are intercepted; no live jobs or model calls.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:1000}});
  await context.addInitScript(()=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:'fixture-only',refresh_token:'fixture-only',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:'fixture-owner',aud:'authenticated'}})));
  let readyCover=false;
  let stage='scanning',created=false,confirmed=null,feedback=null;
  const question='When is it time to leave your job and start something?';
  const books=[{id:'knight',title:'Shoe Dog',author:'Phil Knight',coverUrl:'/fixture-cover.svg'},{id:'dyson',title:'Invention: A Life',author:'James Dyson',coverUrl:'/fixture-cover.svg'}];
  const row=()=>({id:'fixture-guide',question,created_at:'2026-11-06T16:00:00Z',status:stage,cover:{src:stage==='ready'&&!readyCover?null:'/fixture-cover.svg',label:'Starting Something',topic:'Work',background:'#d93825',version:'question-print-v2',status:stage==='ready'&&!readyCover?'pending':'ready'},book_ids:books.map(b=>b.id),proposal:{bookIds:books.map(b=>b.id),books,connection:'Two different routes from a job to a business.'},guide:{introduction:'A fixture introduction.',conclusion:'A fixture conclusion.',minutes:10,originalWords:100,sections:[{bookId:'knight',title:'Shoe Dog',author:'Phil Knight',heading:'Making room for an idea',startLine:100,endLine:120,before:'Context.',text:'Original fixture text.',after:'A transition.',words:100}]}});
  await context.route('**/fixture-cover.svg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#d7aa62"/><circle cx="100" cy="150" r="50" fill="#354d3e"/></svg>'}));
  await context.route('**/functions/v1/reader-subscription',route=>route.fulfill({json:{active:true,used:0,limit:30}}));
  await context.route('**/functions/v1/reading-guides',async route=>{
   const input=route.request().postDataJSON();let body;
   if(input.action==='propose'){created=true;body={id:'fixture-guide'};}
   else if(input.action==='public-list')body={guides:[]};
   else if(input.action==='list')body={guides:created?[row(),...(stage==='ready'?[{...row(),id:'related',question:'How can I make room for an idea?'},{...row(),id:'unrelated',question:'Unrelated guide',book_ids:['another-book']}]:[])]:[],books};
   else if(input.action==='get')body={guide:row(),books};
   else if(input.action==='cover'){readyCover=true;body={cover:row().cover};}
   else if(input.action==='confirm'){confirmed=input.length;stage='composing';body={id:'fixture-guide'};}
   else if(input.action==='position')body={saved:true};
   else if(input.action==='feedback'){feedback=input;body={saved:true};}
   else if(input.action==='context')body={title:'Shoe Dog',text:'Surrounding original fixture text.'};
   else throw Error('Unexpected guide action: '+input.action);
   await route.fulfill({contentType:'application/json',body:JSON.stringify(body),headers:{'Access-Control-Allow-Origin':'*'}});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4321/guides/');
  await page.locator('#guide-question').fill(question);await page.getByRole('button',{name:'Create guide',exact:true}).click();
  await page.locator('[data-guide-processing]:visible').waitFor();assert.equal(await page.locator('[data-guide-question]').isVisible(),false);
  assert.equal(await page.locator('[data-guide-step][data-state=active]').innerText(),'Read the books');
  await page.screenshot({path:'/private/tmp/awb-guide-processing.png',fullPage:false});
  stage='awaiting_confirmation';await page.locator('[data-guide-proposal]:visible').waitFor({timeout:12000});
  assert.equal(await page.locator('[data-proposal-books] .reading-book-card').count(),2);
  for(const label of ['~10 minutes','~25 minutes','~45 minutes'])assert.equal(await page.getByLabel(label,{exact:true}).count(),1);
  await page.getByLabel('~10 minutes',{exact:true}).check();await page.getByRole('button',{name:'Create guide with these books'}).click();
  await page.locator('[data-guide-processing]:visible').waitFor();assert.equal(confirmed,'short');
  assert.equal(await page.locator('[data-guide-step][data-state=active]').innerText(),'Create your reading');
  await page.reload();await page.locator('[data-guide-processing]:visible').waitFor();
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  stage='ready';await page.locator('[data-guide-ready]:visible').waitFor({timeout:12000});assert.ok(page.url().includes('/guides/?id='));assert.equal(await page.locator('[data-ready-introduction]').innerText(),'A fixture introduction.');assert.equal(await page.locator('[data-ready-meta]').innerText(),'About 10 minutes · 1 book');assert.equal(await page.locator('.guide-ready-saved a').getAttribute('href'),'/guides/#your-guides');await page.locator('[data-ready-cover] img').waitFor({timeout:12000});assert.ok(readyCover);await page.locator('[data-open-ready-guide]').click();await page.waitForURL('**/guides/read/?id=*');await page.locator('.original').waitFor();
  assert.equal(await page.locator('[data-reader-cover] .print-guide-generated .print-guide-art img').count(),1);assert.equal(await page.locator('.reading-guide-cover-art').count(),0);
  assert.equal(await page.locator('[data-guide-books] .reading-book-card').count(),2);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  assert.equal(await page.locator('[data-guide-title]').innerText(),question);
  assert.ok((await page.locator('[data-guide-date]').innerText()).includes('2026'));
  assert.equal(await page.locator('[data-guide-books] a').first().getAttribute('href'),'/your-book/?id=knight');
  assert.equal(await page.getByRole('button',{name:'Read in context',exact:true}).count(),0);assert.equal(await page.locator('[data-source-context]').count(),0);assert.equal(await page.locator('.excerpt-source-card').count(),1);assert.equal(await page.locator('.excerpt-source-card .reading-book-cover').count(),1);assert.match(await page.locator('.excerpt-source-location').innerText(),/lines 100–120/);assert.equal(await page.locator('.guide-contents>a').getAttribute('href'),'/guides/#your-guides');
  await page.locator('[data-related-list] article').waitFor();assert.equal(await page.locator('[data-related-list] article').count(),1);
  assert.equal(await page.locator('[data-guide-faq] details').count(),3);
  await page.locator('[data-guide-faq] summary').first().click();assert.equal(await page.locator('[data-guide-faq] details').first().getAttribute('open'),'');
  const prompt=await page.locator('[data-personalize-prompt]').inputValue();for(const value of ['Original fixture text.','A fixture introduction.','A fixture conclusion.','BEGIN ORIGINAL EXCERPT','SKILL.md','not complete books'])assert.ok(prompt.includes(value),value);
  assert.ok(!prompt.includes('source-book editorial digests'));assert.ok(!prompt.includes('fixture-only'));
  await page.evaluate(()=>{window.__opened=[];window.__copied='';window.open=(url)=>{window.__opened.push(url);return null};Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text}}})});
  for(const [provider,url] of Object.entries({chatgpt:'https://chatgpt.com/',claude:'https://claude.ai/new',gemini:'https://gemini.google.com/app',grok:'https://grok.com/'})){
   await page.locator(`[data-ai-provider=${provider}]`).click();await page.locator('[data-personalize-button]').click();await page.waitForFunction(()=>document.querySelector('[data-personalize-button]').dataset.promptCopied==='true');assert.equal(await page.evaluate(()=>window.__copied),prompt);assert.equal(await page.evaluate(()=>window.__opened.at(-1)),url);
  }
  await page.locator('[data-feedback-choice=helpful]').click();await page.locator('[data-content-feedback] textarea').fill('The original passages helped.');await page.locator('[data-feedback-submit]').click();await page.getByText('Feedback sent',{exact:true}).waitFor();assert.deepEqual(feedback,{action:'feedback',id:'fixture-guide',sentiment:'helpful',comment:'The original passages helped.'});
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/private/tmp/awb-guide-template-fixture-desktop.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/private/tmp/awb-guide-template-fixture-mobile.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.reload();await page.locator('.original').waitFor();assert.equal(await page.locator('[data-ai-provider=grok]').getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Blocked')}}}));await page.locator('[data-personalize-button]').click();assert.ok(await page.locator('[data-personalize-fallback]').isVisible());assert.deepEqual(errors,[]);
  console.log('PASS handoff: four mocked providers, full originals, skill link, remembered preference, failed-copy fallback; Q&A, private feedback, source cards, source-related guides, desktop/mobile.');
  console.log('PASS fixture browser: processing card, confirmation, minute labels, resumed processing, guide/book covers, reader and mobile fit. No live generation.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
