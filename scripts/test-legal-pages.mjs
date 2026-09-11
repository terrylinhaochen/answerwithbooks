import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  for (const width of [1280,390]) {
    await page.setViewportSize({width,height:950});
    for (const [path, title] of [['/terms/','Terms of Use'], ['/privacy/','Privacy Policy']]) {
      const response = await page.goto(`http://127.0.0.1:4321${path}`);
      assert.equal(response.status(),200);
      assert.equal(await page.getByRole('heading',{level:1,name:title,exact:true}).count(),1);
      assert.ok(await page.locator('[data-legal-updated]').isVisible());
      assert.equal(await page.locator('[data-legal-draft]').count(),0);
      assert.ok(await page.locator('#contact').innerText().then(text=>text.includes('Operator: AnswerWithBooks')));
      assert.equal(await page.locator('#contact a').getAttribute('href'),'mailto:terrychen2026@u.northwestern.edu');
      assert.doesNotMatch(await page.locator('meta[name=robots]').getAttribute('content'), /noindex/);
      assert.equal(await page.locator('footer a[href="/terms/"]').count(),1);
      assert.equal(await page.locator('footer a[href="/privacy/"]').count(),1);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:`/tmp/awb-${title.startsWith('Terms')?'terms':'privacy'}-${width}.png`});
    }
    await page.goto('http://127.0.0.1:4321/');
    const form = page.locator('.newsletter-signup form');
    await form.getByRole('textbox',{name:'Email address'}).fill('not-submitted@example.com');
    for (const [name,path] of [['Terms','/terms/'],['Privacy Policy','/privacy/']]) {
      const popupPromise = page.waitForEvent('popup');
      await form.getByRole('link',{name,exact:true}).click();
      const popup = await popupPromise;
      await popup.waitForURL(`**${path}`, {waitUntil:'domcontentloaded'});
      assert.equal(new URL(popup.url()).pathname,path);
      await popup.close();
      assert.equal(await form.getByRole('textbox',{name:'Email address'}).inputValue(),'not-submitted@example.com');
    }
    await page.screenshot({path:`/tmp/awb-legal-signup-${width}.png`});
  }
  const sitemap = await readFile('dist/sitemap-0.xml','utf8');
  assert.ok(sitemap.includes('answerwithbooks.com/terms/'));
  assert.ok(sitemap.includes('answerwithbooks.com/privacy/'));
  assert.deepEqual(errors,[]);
  console.log('PASS: reviewed Terms/Privacy routes, identity/contact and sitemap inclusion, footer/form links, desktop/mobile, input preserved across policy tabs. No email submitted.');
} finally {await browser.close();}
