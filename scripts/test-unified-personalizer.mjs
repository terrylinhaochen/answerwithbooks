import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:4321';
const readBody = (collection,slug) => readFileSync(`src/content/${collection}/${slug}.md`,'utf8').replace(/^---\s*\n[\s\S]*?\n---\s*\n/,'').trim();
const bookSlugs = ['the-mom-test','the-crowd'];
const answerSlugs = ['how-to-validate-an-idea-without-fooling-yourself','how-to-fix-user-interviews-that-are-not-teaching-you-anything'];
const tutorialSlugs = ['meeting-notes-to-action-plan','customer-feedback-to-evidence','evidence-to-decision-memo'];
const routes = [...bookSlugs.map(slug=>`/books/${slug}/`), ...answerSlugs.map(slug=>`/answers/${slug}/`), ...tutorialSlugs.map(slug=>`/guides/${slug}/`)];
const providers = {chatgpt:'https://chatgpt.com/',claude:'https://claude.ai/new',gemini:'https://gemini.google.com/app',grok:'https://grok.com/'};
const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context = await browser.newContext({permissions:['clipboard-read','clipboard-write']});
await context.route(/https:\/\/(chatgpt\.com|claude\.ai|gemini\.google\.com|grok\.com)\//,r=>r.fulfill({body:'Test AI destination — no prompt submitted'}));
const page = await context.newPage();
const errors = [];
page.on('pageerror',e=>errors.push(e.message));
try {
  let catalogPages = 0;
  for (const collection of ['books','answers']) {
    for (const file of readdirSync(`src/content/${collection}`).filter(name=>name.endsWith('.md'))) {
      const slug = file.replace(/\.md$/,'');
      const html = readFileSync(`dist/${collection}/${slug}/index.html`,'utf8');
      assert.equal((html.match(/<section\b[^>]*\bdata-reading-personalizer(?:\s|=|>)/g)||[]).length,1,`${slug}: one shared personalizer`);
      assert.ok(html.indexOf('data-reading-content') < html.indexOf('data-reading-personalizer'));
      assert.ok(!html.includes('data-copy-agent-prompt'));
      catalogPages++;
    }
  }
  for (const route of routes) {
    await page.goto(base+route);
    const isBook = route.startsWith('/books/');
    const root = page.locator('[data-reading-personalizer]');
    assert.equal(await root.count(),1);
    assert.equal(await root.locator('[data-ai-provider]').count(),4);
    assert.equal(await page.locator('[data-agent-digest]').count(),0);
    assert.ok(await root.getByRole('heading',{name:`Connect this ${isBook?'book':'guide'} to your experience.`,exact:true}).count());
    assert.ok(await page.evaluate(()=>{
      const content = document.querySelector('[data-reading-content]');
      const personalizer = document.querySelector('[data-reading-personalizer]');
      const faq = personalizer.closest('article').nextElementSibling;
      const feedback = document.querySelector('[data-content-feedback]');
      return !!(content.compareDocumentPosition(personalizer)&4) && !!(personalizer.compareDocumentPosition(faq)&4) && !!(faq.compareDocumentPosition(feedback)&4);
    }), 'Content → Personalize → Q&A → feedback');
    const prompt = await root.locator('[data-personalize-prompt]').inputValue();
    const slug = route.split('/')[2];
    if (isBook) {
      assert.ok(prompt.includes(readBody('books',slug)));
      assert.ok(prompt.includes('Book URL Contract (self-contained)'));
    } else {
      assert.ok(prompt.includes('Guide Reading Contract (self-contained)'));
      assert.ok(prompt.includes('You do not need to open any URL or install a skill.'));
      assert.ok(prompt.includes('never invent my goals'));
      if (route.startsWith('/answers/')) {
        assert.ok(prompt.includes(readBody('answers',slug)),'Full guide included');
        const save = page.getByRole('button',{name:'Save this guide',exact:true});
        await save.click();
        assert.equal(await page.getByRole('button',{name:'Remove saved guide',exact:true}).getAttribute('aria-pressed'),'true');
        await page.getByRole('button',{name:'Remove saved guide',exact:true}).click();
        assert.ok(await page.getByRole('link',{name:'Speed read source books',exact:true}).count());
        const source = readFileSync(`src/content/answers/${slug}.md`,'utf8').match(/^books: \[(.*)\]/m)[1];
        for (const book of JSON.parse(`[${source}]`)) assert.ok(prompt.includes(readBody('books',book)),`Full source-book digest: ${book}`);
      } else {
        for (const selector of ['#practice-text','#prompt-text','[data-guide-check]']) assert.ok(await page.locator(selector).count(),'Tutorial interactions preserved');
        assert.ok(prompt.includes(await page.locator('#practice-text').innerText()));
        assert.ok(prompt.includes(await page.locator('#prompt-text').innerText()));
        const check = page.locator('[data-guide-check]').first();
        await check.check(); await page.reload(); assert.ok(await check.isChecked(),'Practice progress preserved');
      }
    }
    for (const [provider,url] of Object.entries(providers)) {
      await root.locator(`[data-ai-provider=${provider}]`).click();
      const action = root.locator('[data-personalize-button]');
      assert.equal(await action.getAttribute('href'),url);
      assert.equal(await root.locator(`[data-ai-provider=${provider}]`).getAttribute('aria-pressed'),'true');
      const popupPromise = page.waitForEvent('popup');
      await action.click();
      const popup = await popupPromise;
      await popup.waitForURL(url,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('[data-personalize-status]').textContent.includes('copied'));
      assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),prompt);
      await popup.close();
    }
    for (const width of [1280,390]) {
      await page.setViewportSize({width,height:950});
      await root.scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      if (slug==='how-to-validate-an-idea-without-fooling-yourself' || slug==='meeting-notes-to-action-plan') await page.screenshot({path:`/tmp/awb-personalize-${slug}-${width}.png`});
    }
    await page.reload();
    assert.equal(await root.locator('[data-ai-provider=grok]').getAttribute('aria-pressed'),'true','Preference persists across pages');
  }
  await page.goto(base+'/answers/'+answerSlugs[0]+'/');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(Error('Blocked'))},configurable:true}));
  const popupPromise = page.waitForEvent('popup');
  await page.locator('[data-personalize-button]').click();
  await (await popupPromise).close();
  await page.waitForFunction(()=>document.querySelector('[data-personalize-prompt]').closest('details').open);
  assert.ok(await page.locator('[data-personalize-prompt]').evaluate(el=>el.selectionEnd===el.value.length));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,catalogPages,sampleRoutes:routes.length,providers:4,fullGuideAndSources:true,sectionOrder:true,mobile:true,clipboard:true,manualFallback:true,rememberedChoice:true,tutorialsPreserved:true,externalAI:'mocked; no AI response or personal data submission tested'},null,2));
} finally {await browser.close();}
