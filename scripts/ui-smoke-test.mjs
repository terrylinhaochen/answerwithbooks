import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(new URL('..', import.meta.url).pathname);
const distRoot = join(root, 'dist');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const supabaseRequests = [];
const remoteContentMaps = [];
const remoteContentMapCollections = [];
const mockAccessToken = makeMockAccessToken();
let activeUser = null;

if (!existsSync(join(distRoot, 'index.html'))) {
  throw new Error('Missing dist/index.html. Run npm run build:local before npm run test:ui.');
}

const server = createStaticServer(distRoot);
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const { port } = server.address();
const baseURL = `http://127.0.0.1:${port}`;

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(existsSync(chromePath) ? { executablePath: chromePath } : {}),
  });

  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  await context.route('https://*.supabase.co/**', handleSupabaseRoute);
  const page = await context.newPage();

  await testHomeInteractions(page);
  await testSkills(page);
  await testWorkplaceGuides(page);
  await testBookPersonalization(page);
  await testSpeedReader(page);
  await testBookEditorialSlice(page);
  await testIllustrationContrast(page);
  await testFilters(page);
  await testBookRequest(page);
  await testAuthRedirects(page);
  await testOnboardingSignupProfileAndShelf(page);
  await testLoginAndSignout(page);
  await testEmailLinkCallback(page);
  await testMappingAndCommunityCollection(page);

  assert.ok(
    supabaseRequests.some((request) => request.kind === 'signup'),
    'signup flow should call Supabase signup'
  );
  assert.ok(
    supabaseRequests.some((request) => request.kind === 'login'),
    'login flow should call Supabase password token endpoint'
  );
  assert.ok(
    supabaseRequests.some((request) => request.kind === 'update-user'),
    'onboarding sync should update Supabase user metadata'
  );
  assert.ok(
    supabaseRequests.some((request) => request.kind === 'profile-upsert'),
    'onboarding sync should attempt profiles upsert'
  );
  assert.ok(
    supabaseRequests.some((request) => request.kind === 'content-map-insert'),
    'content mapping should insert a Supabase content map'
  );
  assert.ok(
    supabaseRequests.some((request) => request.kind === 'content-map-collection-insert'),
    'community collection should insert a Supabase content map collection'
  );
  assert.ok(
    supabaseRequests.some((request) => request.kind === 'book-request-insert'),
    'book request modal should insert a Supabase book request'
  );
  assert.ok(
    supabaseRequests.some((request) => request.kind === 'content-feedback-insert' && request.body.content_type === 'book'),
    'book feedback should insert a Supabase content feedback row'
  );
  assert.ok(
    supabaseRequests.some((request) => request.kind === 'content-feedback-insert' && request.body.content_type === 'answer'),
    'answer feedback should insert a Supabase content feedback row'
  );

  await context.close();
  console.log('UI smoke test passed: additive workplace guides, original Skills page, speed-reader matching, skills install, book personalization handoff, legacy redirect, mobile nav, carousel, filters, book requests, content feedback, saved books, saved answers, onboarding, signup, profile sync, login, email-link callback, signout, content mapping, and community collection verified.');
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise((resolveClose) => server.close(resolveClose));
}

async function testHomeInteractions(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await assertNoMobileHeaderOverlap(page);

  await page.locator('[data-carousel-slide]:visible [data-carousel-dot="1"]').click();
  await assertVisibleText(page, '[data-carousel-slide]:visible', 'How to tell whether to pivot or keep going');

  await page.locator('[data-copy-install]').scrollIntoViewIfNeeded();
  await page.locator('[data-copy-install]').click();
  await expectText(page.locator('[data-copy-install]'), /Copied/);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(copied, 'npx answer-with-books install --skill --api');
}

async function testFilters(page) {
  await page.goto('/answers/', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('[data-filter-item]:visible').count(), 9);
  await page.locator('[data-filter-search]').fill('pivot');
  await expectText(page.locator('[data-filter-count]'), /insight/);
  await assertVisibleText(page, '[data-filter-list]', 'pivot');
  await page.locator('[data-filter-search]').fill('zzzz-no-answer');
  await expectText(page.locator('[data-filter-empty]'), /No insights match/);

  await page.goto('/books/', { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('[data-filter-item]:visible').count(), 9);
  assert.equal(await page.locator('[data-book-request-card]').isVisible(), true);
  const totalBooksText = await page.locator('[data-filter-count]').textContent();
  const totalBooks = Number(totalBooksText?.match(/\d+/)?.[0] ?? 0);
  const pageCount = Math.max(1, Math.ceil((totalBooks + 1) / 10));
  assert.ok(totalBooks >= 9, 'book shelf should expose a populated catalog');
  await page.locator('[data-pagination-next]').click();
  assert.equal(await page.locator('[data-filter-item]:visible').count(), 10);
  assert.equal(await page.locator('[data-book-request-card]').isVisible(), false);
  for (let pageNumber = 2; pageNumber < pageCount; pageNumber += 1) {
    await page.locator('[data-pagination-next]').click();
  }
  const expectedLastPageBooks = totalBooks - 9 - Math.max(0, pageCount - 2) * 10;
  assert.equal(await page.locator('[data-filter-item]:visible').count(), expectedLastPageBooks);
  assert.equal(await page.locator('[data-book-request-card]').isVisible(), false);
  for (let pageNumber = pageCount; pageNumber > 1; pageNumber -= 1) {
    await page.locator('[data-pagination-prev]').click();
  }
  await page.locator('[data-filter-search]').fill('deep work');
  await expectText(page.locator('[data-filter-count]'), /1 book/);
  await assertVisibleText(page, '[data-filter-list]', 'Deep Work');
  await page.locator('[data-filter-search]').fill('zzzz-no-book');
  await expectText(page.locator('[data-filter-count]'), /0 books/);
}

async function testBookRequest(page) {
  await page.route('https://openlibrary.org/search.json**', (route) => fulfillJson(route, { docs: [{ key: '/works/OL1708060W', title: 'The Art of Gathering', author_name: ['Priya Parker'], first_publish_year: 2018 }] }));
  await page.goto('/books/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-open-book-request]').click();
  await page.locator('#book-query').fill('The Mom Test');
  const before = supabaseRequests.filter((request) => request.kind === 'book-request-insert').length;
  await page.locator('[data-book-match]').click();
  await assertVisibleText(page, '[data-book-candidates]', 'The Mom Test');
  assert.equal(supabaseRequests.filter((request) => request.kind === 'book-request-insert').length, before, 'Matching must not save before confirmation');
  const bookEmail = page.locator('[data-book-request-form] input[name="email"]');
  assert.equal(await page.locator('[name="remember"]').count(), 0);
  assert.equal(await bookEmail.getAttribute('required'), '');
  await page.locator('[data-book-request-submit]').click();
  assert.equal(await bookEmail.evaluate(input => input.validity.valueMissing), true);
  assert.equal(supabaseRequests.filter(request => request.kind === 'book-request-insert').length, before, 'Missing email must not save');
  await bookEmail.fill('not-an-email');
  await page.locator('[data-book-request-submit]').click();
  assert.equal(await bookEmail.evaluate(input => input.validity.typeMismatch), true);
  assert.equal(supabaseRequests.filter(request => request.kind === 'book-request-insert').length, before, 'Invalid email must not save');
  await bookEmail.fill('shelf@example.test');

  await page.locator('[data-book-request-submit]').click();
  await assertVisibleText(page, '[data-added-title]', 'Added to your shelf');
  assert.equal(await page.locator('[data-added-read]').getAttribute('href'), '/books/the-mom-test/');
  const row = supabaseRequests.filter((request) => request.kind === 'book-request-insert').at(-1).body;
  assert.equal(row.title, 'The Mom Test'); assert.equal(row.matched_book_slug, 'the-mom-test');
  assert.equal(row.requester_email, 'shelf@example.test'); assert.equal(row.input_kind, 'name');
  await page.locator('[data-close-book-request]').first().click();
  await assertVisibleText(page, '[data-book-additions]', 'The Mom Test');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await assertVisibleText(page, '[data-book-additions]', 'The Mom Test');
  await page.locator('[data-open-book-request]').click();
  assert.equal(await page.locator('[name="email"]').inputValue(), '');
  await page.locator('#book-query').fill('The Mom Test'); await page.locator('[data-book-match]').click();
  await page.locator('[name="email"]').fill('shelf@example.test');
  await page.locator('[data-book-request-submit]').click();
  await assertVisibleText(page, '[data-added-title]', 'Already on your shelf');
  assert.equal(supabaseRequests.filter((request) => request.kind === 'book-request-insert').length, before + 1, 'Repeated confirmation should not create a duplicate');
  await page.locator('[data-book-add-another]').click();
  await page.locator('#book-query').fill('The Art of Gathering'); await page.locator('[data-book-match]').click();
  await assertVisibleText(page, '[data-book-candidates]', 'Priya Parker');
  await page.locator('[name="email"]').fill('shelf@example.test');
  await page.locator('[data-book-request-submit]').click();
  await assertVisibleText(page, '[data-added-description]', 'Digest requested');
  assert.equal(await page.evaluate(() => localStorage.getItem('awb:book-add-email')), null);
  assert.equal(supabaseRequests.filter((request) => request.kind === 'book-request-insert').at(-1).body.external_id, '/works/OL1708060W');
  await page.locator('[data-book-add-another]').click();
  await page.locator('[data-book-file]').setInputFiles({ name: 'bad.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a pdf') });
  await page.locator('[data-book-match]').click();
  await expectText(page.locator('[data-book-request-status]'), /valid PDF/);
  assert.equal(await page.locator('[data-book-identify-form]').isVisible(), true);
  await page.locator('[data-clear-book-file]').click();
  await page.locator('[data-book-manual]').click();
  await page.locator('[name="email"]').fill('shelf@example.test');
  await page.locator('[name="title"]').fill('A New Book'); await page.locator('input[name="author"]').fill('An Author');
  await page.route('https://*.supabase.co/rest/v1/book_requests', (route) => fulfillJson(route, { message: 'Temporary error' }, 500));
  await page.locator('[data-book-request-submit]').click();
  await expectText(page.locator('[data-book-request-status]'), /couldn’t save/);
  assert.equal(await page.locator('[name="title"]').inputValue(), 'A New Book');
  assert.equal(await page.locator('[data-book-request-submit]').isEnabled(), true);
  await page.unroute('https://*.supabase.co/rest/v1/book_requests');
  await page.locator('[data-close-book-request]').first().click();
  await page.unroute('https://openlibrary.org/search.json**');
}

async function testWorkplaceGuides(page) {
  await page.goto('/guides/');
  assert.deepEqual((await page.locator('nav[aria-label="Main"] a').allTextContents()).map(text => text.trim()), ['Books', 'Guides', 'Tools']);
  assert.equal((await page.locator('nav [aria-current="page"]').textContent()).trim(), 'Guides');
  const questionEntry = page.locator('[data-question-invite] a');
  assert.equal(await questionEntry.getAttribute('href'), 'https://forms.gle/bd5By1m4Vko9sn4g6');
  assert.doesNotMatch(await page.locator('[data-question-invite]').textContent(), /Sign in to save/);
  await page.goto('/');
  assert.equal(await page.locator('[data-question-invite] a').count(), 1);
  const slugs = ['meeting-notes-to-action-plan', 'customer-feedback-to-evidence', 'evidence-to-decision-memo'];
  for (const slug of slugs) {
    await page.goto(`/guides/${slug}/`);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('[data-guide-check]').count(), 4);
    await page.locator('[data-copy-target="practice-text"]').click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await page.locator('#practice-text').textContent());
    await page.locator('[data-copy-target="prompt-text"]').click();
    const prompt = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(prompt.length > 300);
    await page.locator('[data-guide-check]').first().check();
    await page.reload();
    assert.equal(await page.locator('[data-guide-check]').first().isChecked(), true);
    assert.match(await page.locator('[data-guide-progress]').textContent(), /1 of 4/);
    const source = page.locator('article aside a');
    const response = await page.request.get(await source.getAttribute('href'));
    assert.equal(response.status(), 200, 'source book should exist');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'guide should fit mobile');
  }
  await page.goto('/tools/');
  await page.waitForURL('**/skills/');
  assert.equal((await page.locator('nav [aria-current="page"]').textContent()).trim(), 'Tools');
  assert.equal(await page.locator('h1').textContent(), 'Give your agent a shelf it can call.');
  assert.equal(await page.locator('[data-prompt-builder]').count(), 0);
  await page.locator('[data-copy-skill]').click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'npx answer-with-books install --skill --api');
  await page.goto('/guides/');
  assert.equal(await page.locator('h1').textContent(), 'Areas top of mind');
  assert.equal(await page.locator('[data-filter-item]:visible').count(), 9);
  assert.equal(await page.locator('#ai-tutorials a').count(), 3);
  await page.locator('[data-filter-search]').fill('pivot');
  assert.ok(await page.locator('[data-filter-item]:visible').count() > 0);
  await page.locator('[data-filter-search]').fill('no-such-guide-xyz');
  assert.equal(await page.locator('[data-filter-item]:visible').count(), 0);
  assert.equal(await page.locator('[data-filter-empty]').isVisible(), true);
  assert.equal(await page.locator('#ai-tutorials a').count(), 3, 'tutorial additions should remain available');
  await page.goto('/answers/');
  assert.equal((await page.locator('nav [aria-current="page"]').textContent()).trim(), 'Guides');
  await page.goto('/skills/');
  assert.equal((await page.locator('nav [aria-current="page"]').textContent()).trim(), 'Tools');
}

async function testSkills(page) {
  await page.goto('/ask/', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**/skills/');
  await assertVisibleText(page, 'h1', 'Give your agent a shelf it can call');
  assert.equal(await page.locator('textarea').count(), 0);
  await page.locator('[data-copy-skill]').click();
  await expectText(page.locator('[data-copy-skill]'), /Copied/);
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'npx answer-with-books install --skill --api');
}

async function testBookPersonalization(page) {
  await page.goto('/books/atomic-habits/', { waitUntil: 'domcontentloaded' });
  await assertVisibleText(page, '[data-book-personalizer]', 'Connect this book to your experience');
  assert.equal(await page.locator('[data-book-personalizer] [data-ai-provider] img').count(), 4);
  assert.equal(await page.locator('[data-book-personalizer] details').count(), 0);
  const personalizerTop = await page.locator('[data-book-personalizer]').evaluate((element) => element.getBoundingClientRect().top);
  const digestTop = await page.locator('.prose-awb').evaluate((element) => element.getBoundingClientRect().top);
  assert.ok(personalizerTop > digestTop, 'personalization should appear after the digest body');
  await page.locator('[data-ai-provider="claude"]').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('awb:preferred-ai')), 'claude');
  await expectText(page.locator('[data-personalize-button]'), /Personalize in Claude/);
  const claudeDestination = new URL(await page.locator('[data-personalize-button]').getAttribute('href'));
  assert.equal(claudeDestination.origin + claudeDestination.pathname, 'https://claude.ai/new');
  assert.match(claudeDestination.searchParams.get('q'), /Start a personalized reading experience for Atomic Habits/);
  assert.match(claudeDestination.searchParams.get('q'), /answerwithbooks\.com\/books\/atomic-habits/);
  assert.match(claudeDestination.searchParams.get('q'), /Crowdlisten_books\/main\/skill\/answer-with-books\/SKILL\.md/);
  assert.doesNotMatch(claudeDestination.searchParams.get('q'), /Use relevant context you already know/);
  assert.doesNotMatch(claudeDestination.searchParams.get('q'), /End with one idea to remember/);

  await page.locator('[data-personalize-button]').evaluate((element) => {
    element.addEventListener('click', (event) => event.preventDefault(), { once: true });
  });
  await page.locator('[data-personalize-button]').click();
  await expectText(page.locator('[data-personalize-button]'), /Prompt copied/);
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(prompt, /Start a personalized reading experience for Atomic Habits/);
  assert.match(prompt, /answerwithbooks\.com\/books\/atomic-habits/);
  assert.match(prompt, /Crowdlisten_books\/main\/skill\/answer-with-books\/SKILL\.md/);
  assert.match(prompt, /follow the skill's Book URL Contract, and begin/);
  assert.doesNotMatch(prompt, /Use relevant context you already know/);
  assert.doesNotMatch(prompt, /End with one idea to remember/);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectText(page.locator('[data-personalize-button]'), /Personalize in Claude/);
  assert.equal(await page.locator('[data-ai-provider="claude"]').getAttribute('aria-pressed'), 'true');

  await page.locator('[data-ai-provider="chatgpt"]').click();
  const chatGptDestination = new URL(await page.locator('[data-personalize-button]').getAttribute('href'));
  assert.equal(chatGptDestination.origin + chatGptDestination.pathname, 'https://chatgpt.com/');
  assert.match(chatGptDestination.searchParams.get('q'), /Start a personalized reading experience for Atomic Habits/);
}


async function testSpeedReader(page) {
  for (const [id, title] of [['the-mom-test', 'The Mom Test'], ['designing-your-life', 'Designing Your Life']]) {
    await page.goto(`/books/${id}/`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('link', { name: 'Speed read this book' }).click();
    await assertVisibleText(page, '[data-reader-book]', title);
    assert.equal(await page.locator('nav[aria-label="Main"]').count(), 0);
    assert.equal(await page.locator('[data-reader-chapters]').getAttribute('open'), null);
    const firstWord = await page.locator('[data-reader-current]').textContent();
    assert.notEqual(firstWord, 'Ready');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForFunction((word) => document.querySelector('[data-reader-current]').textContent !== word, firstWord);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const pausedWord = await page.locator('[data-reader-current]').textContent();
    await page.waitForTimeout(450);
    assert.equal(await page.locator('[data-reader-current]').textContent(), pausedWord, 'Pause should stop word advancement');
    await page.getByRole('button', { name: 'Restart section' }).click();
    assert.equal(await page.locator('[data-reader-current]').textContent(), firstWord);
    await page.locator('[data-reader-chapters] summary').click();
    const chapter = page.locator('[data-chapter-index="1"]');
    const chapterTitle = (await chapter.textContent()).replace(/^2\. /, '');
    await chapter.click();
    await assertVisibleText(page, 'h1', chapterTitle);
    await assertVisibleText(page, '[data-reader-book]', title);
    assert.equal(await page.locator('[data-reader-chapters]').getAttribute('open'), null);
    await page.getByRole('button', { name: 'Read text', exact: true }).click();
    assert.equal(await page.locator('[data-reader-text]').isVisible(), true);
    assert.equal(await page.locator('[data-reader-stage]').isVisible(), false);
    assert.ok((await page.locator('[data-reader-text]').textContent()).length > 100);
    await page.getByRole('button', { name: 'Speed read', exact: true }).click();
    assert.equal(await page.locator('[data-reader-stage]').isVisible(), true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await assertVisibleText(page, 'h1', chapterTitle);
    await page.locator('[data-reader-exit]').click();
    assert.equal(new URL(page.url()).pathname, `/books/${id}/`);
  }
  await page.goto('/speed-read/?q=Should%20I%20quit%20my%20job%20or%20test%20another%20career%20path%20first%3F', { waitUntil: 'domcontentloaded' });
  await expectText(page.locator('[data-reader-book]'), /Designing Your Life|So Good They Can't Ignore You/);
  assert.match(await page.locator('[data-reader-exit]').getAttribute('href'), /^\/answers\//);
  assert.notEqual(await page.locator('[data-reader-current]').textContent(), 'Ready');
  await page.goto('/speed-read/?book=the-mom-test&section=1', { waitUntil: 'domcontentloaded' });
  const backward = page.getByRole('button', { name: 'Backward', exact: true });
  const forward = page.getByRole('button', { name: 'Forward', exact: true });
  assert.equal(await backward.isDisabled(), true);
  assert.equal(await forward.isEnabled(), true);
  const sectionWords = (await page.locator('[data-reader-text] p').allTextContents()).join(' ').split(/\s+/);
  await forward.click();
  assert.equal(await page.locator('[data-reader-current]').textContent(), sectionWords[1]);
  await forward.click();
  assert.equal(await page.locator('[data-reader-current]').textContent(), sectionWords[2]);
  await backward.click();
  assert.equal(await page.locator('[data-reader-current]').textContent(), sectionWords[1]);
  await backward.click();
  assert.equal(await backward.isDisabled(), true);
  await page.locator('h1').click();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-reader-current]').textContent(), sectionWords[1]);
  await page.keyboard.press('ArrowLeft');
  assert.equal(await backward.isDisabled(), true);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-reader-backward]').disabled);
  await backward.click();
  const pausedWord = await page.locator('[data-reader-current]').textContent();
  await page.waitForTimeout(500);
  assert.equal(await page.locator('[data-reader-current]').textContent(), pausedWord, 'Stepping must pause playback');
  await page.locator('h1').click();
  for (let index = 0; index < sectionWords.length; index++) await page.keyboard.press('ArrowRight');
  assert.equal(await forward.isDisabled(), true);
  assert.equal(await page.locator('[data-reader-current]').textContent(), sectionWords.at(-1));
  await backward.click();
  assert.equal(await forward.isEnabled(), true);
  await page.getByRole('button', { name: 'Read text', exact: true }).click();
  assert.equal(await backward.isDisabled(), true);
  assert.equal(await forward.isDisabled(), true);
  await page.goto('/speed-read/?book=missing-book', { waitUntil: 'domcontentloaded' });
  await assertVisibleText(page, 'h1', 'Book not found');
  assert.equal(await page.locator('[data-reader-play]').isEnabled(), false);
}

async function testBookEditorialSlice(page) {
  await page.goto('/books/the-mom-test/', { waitUntil: 'domcontentloaded' });
  await assertVisibleText(page, '.prose-awb', 'The central problem in customer research is not that people lie.');
  await assertVisibleText(page, '.prose-awb', 'Evidence gets stronger as it becomes more costly');
  assert.equal(await page.locator('.awb-line-illustration').count(), 1);
  const prose = await page.locator('.prose-awb').innerText();
  assert.doesNotMatch(prose, /A worked example|When this lens breaks|Best paired with|Related books/);
  const paragraphCount = await page.locator('.prose-awb p').count();
  const listItemCount = await page.locator('.prose-awb li').count();
  assert.ok(paragraphCount > listItemCount, 'book digest should be prose-led rather than list-led');
  await assertVisibleText(page, '[data-content-feedback]', 'Was this useful?');
  await page.locator('[data-content-feedback] [data-feedback-choice="helpful"]').click();
  await page.locator('[data-content-feedback] textarea[name="comment"]').fill('The evidence ladder made the book easier to apply.');
  await page.locator('[data-content-feedback] [data-feedback-submit]').click();
  await expectText(page.locator('[data-content-feedback] [data-feedback-status]'), /Thank you/);
}

async function testIllustrationContrast(page) {
  await page.goto('/answers/how-to-keep-a-smart-team-from-making-a-dumb-decision/', {
    waitUntil: 'domcontentloaded',
  });
  const colors = await page.locator('.awb-line-illustration').evaluate((figure) => {
    const box = figure.querySelector('.awb-line-illustration__box');
    const label = figure.querySelector('.awb-line-illustration__label');
    return {
      box: box ? getComputedStyle(box).fill : '',
      label: label ? getComputedStyle(label).fill : '',
    };
  });
  assert.ok(colors.box, 'illustration box should have a computed fill');
  assert.ok(colors.label, 'illustration label should have a computed fill');
  assert.notEqual(colors.box, colors.label, 'illustration labels should contrast with their boxes');

  await page.goto('/books/good-strategy-bad-strategy/', { waitUntil: 'domcontentloaded' });
  const bookColors = await page.locator('.digest-illustration').evaluate((figure) => {
    const box = figure.querySelector('rect');
    const label = figure.querySelector('text');
    return {
      background: getComputedStyle(figure).backgroundColor,
      box: box ? getComputedStyle(box).fill : '',
      label: label ? getComputedStyle(label).fill : '',
    };
  });
  assert.ok(bookColors.background, 'book illustration should have a computed background');
  assert.ok(bookColors.box, 'book illustration box should have a computed fill');
  assert.ok(bookColors.label, 'book illustration label should have a computed fill');
  assert.notEqual(bookColors.box, bookColors.label, 'book illustration labels should contrast with their boxes');
}

async function testAuthRedirects(page) {
  activeUser = null;
  await page.goto('/profile/', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**/onboarding/start/?from=profile');
  assert.match(page.url(), /\/onboarding\/start\/\?from=profile$/);
}

async function testOnboardingSignupProfileAndShelf(page) {
  await page.goto('/onboarding/start/', { waitUntil: 'domcontentloaded' });
  await assertVisibleText(page, 'h1', 'What do you want help with?');
  assert.equal(await page.locator('[data-step-jump]').count(), 0);
  assert.equal(await page.locator('[data-chatgpt-connect]').count(), 0);
  assert.doesNotMatch(await page.locator('body').innerText(), /Start with demand|ChatGPT note|Your choices are saved in this browser/);
  await page.locator('label').filter({ hasText: 'Business' }).click();
  await page.locator('label').filter({ hasText: 'Career' }).click();
  await page.locator('[data-step-next]').click();
  await assertVisibleText(page, '[data-onboarding-step="1"]', 'Where should we start?');
  await page.locator('label').filter({ hasText: 'Use books I already care about' }).click();
  await page.locator('[data-step-next]').click();
  await assertVisibleText(page, '[data-onboarding-step="2"]', 'What is top of mind?');
  await page.locator('textarea[name="goal"]').fill('I need better customer interviews and career decisions.');
  await page.locator('[data-step-submit]').click();
  await page.waitForURL('**/signup/?from=onboarding');
  assert.equal(await page.evaluate(() => localStorage.getItem('awb:onboarding:pending')), '1');
  await assertVisibleText(page, '[data-signup-copy]', 'Create an account to sync it to your profile');

  await page.locator('#email').fill('reader@example.test');
  await page.locator('#password').fill('awb-Test-Password-123!');
  await page.locator('#submit-btn').click();
  await page.waitForURL('**/profile/?onboarded=1');
  await page.waitForSelector('[data-profile-shell]:not(.hidden)');
  await assertVisibleText(page, '[data-onboarding-focus]', 'business, career');
  await assertVisibleText(page, '[data-onboarding-shelf]', 'owned');
  await assertVisibleText(page, '[data-onboarding-goal]', 'customer interviews');
  await assertVisibleText(page, '[data-onboarding-chatgpt]', 'Not requested yet.');
  await assertVisibleText(page, '[data-onboarding-sync]', 'Synced to your account.');
  assert.equal(await page.evaluate(() => localStorage.getItem('awb:onboarding:pending')), null);

  await page.goto('/books/atomic-habits/', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-save-book]').click();
  assert.equal(await page.locator('[data-save-book]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[data-save-book]').getAttribute('aria-label'), 'Remove saved book');
  assert.equal(await page.locator('[data-save-book] svg').count(), 1, 'Saving must preserve the bookmark icon');
  await page.locator('[data-save-book]').click();
  assert.equal(await page.locator('[data-save-book]').getAttribute('aria-pressed'), 'false');
  await page.locator('[data-save-book]').click();
  await page.goto('/my-books/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#library-content:not(.hidden)');
  await assertVisibleText(page, '#saved-list', 'Atomic Habits');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expectText(page.locator('[data-auth-link]'), /Profile/);
  assert.equal(await page.locator('[data-onboarding-link]').isHidden(), true);
}

async function testLoginAndSignout(page) {
  await page.goto('/my-books/', { waitUntil: 'domcontentloaded' });
  await page.locator('#signout-btn').click();
  await page.waitForURL('**/');
  assert.ok(
    supabaseRequests.some((request) => request.kind === 'logout'),
    'signout flow should call Supabase logout'
  );
  activeUser = null;
  await clearSupabaseBrowserState(page);

  await page.goto('/login/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#login-form');
  await page.locator('#email').fill('reader@example.test');
  await page.locator('#password').fill('awb-Test-Password-123!');
  await page.locator('#submit-btn').click();
  await page.waitForURL('**/my-books/');
  await page.waitForSelector('#library-content:not(.hidden)');
  await assertVisibleText(page, '#library-content', 'Welcome back, reader');
}

async function testEmailLinkCallback(page) {
  activeUser = makeUser('reader@example.test');
  await clearSupabaseBrowserState(page);
  await page.goto(`/login/#access_token=${mockAccessToken}&refresh_token=mock-refresh-token&type=signup`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForURL('**/my-books/');
  await page.waitForSelector('#library-content:not(.hidden)');
  await assertVisibleText(page, '#library-content', 'Welcome back, reader');
}

async function testMappingAndCommunityCollection(page) {
  await page.goto('/answers/how-to-fix-user-interviews-that-are-not-teaching-you-anything/', {
    waitUntil: 'domcontentloaded',
  });
  assert.equal(await page.locator('[data-reading-content]').isVisible(), true);
  await assertVisibleText(page, '[data-reading-content] .prose-awb', 'Find the broken link before changing the script');
  assert.equal(await page.locator('[data-reading-content] .awb-line-illustration').count(), 1);
  const sourceBrief = await page.locator('[data-reading-content] .prose-awb').innerText();
  assert.doesNotMatch(sourceBrief, /When this lens breaks|Best paired with|Related books/);
  assert.ok(
    await page.locator('[data-reading-content] .prose-awb p').count() >
      await page.locator('[data-reading-content] .prose-awb li').count(),
    'answer source brief should be prose-led rather than list-led'
  );
  // Keep this smoke test local; destination behavior is tested separately.
  await page.locator('[data-personalize-button]').evaluate(a => { a.removeAttribute('target'); a.setAttribute('href','#personalize'); });
  await page.locator('[data-personalize-button]').click();
  await expectText(page.locator('[data-personalize-status]'), /copied/);
  const agentPrompt = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(agentPrompt, /Guide Reading Contract \(self-contained\)/);
  assert.match(agentPrompt, /how-to-fix-user-interviews-that-are-not-teaching-you-anything/);
  assert.match(agentPrompt, /never invent my goals, constraints, prior attempts/);
  assert.match(agentPrompt, /BEGIN SOURCE-BOOK EDITORIAL DIGEST/);
  await page.locator('[data-save-answer]').click();
  assert.equal(await page.locator('[data-save-answer]').getAttribute('aria-pressed'),'true');
  await assertVisibleText(page, '[data-content-feedback]', 'Was this useful?');
  await page.locator('[data-content-feedback] [data-feedback-choice="not_helpful"]').click();
  await page.locator('[data-content-feedback] textarea[name="comment"]').fill('The decision boundary could be more specific.');
  await page.locator('[data-content-feedback] [data-feedback-submit]').click();
  await expectText(page.locator('[data-content-feedback] [data-feedback-status]'), /Thank you/);

  await page.goto('/upload/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-upload-shell]:not(.hidden)');
  await page.locator('input[name="title"]').fill('Customer interview map');
  await page
    .locator('textarea[name="problem"]')
    .fill('I need to validate a startup idea without getting fooled by polite user interviews.');
  await page
    .locator('textarea[name="sourceNote"]')
    .fill('Users compliment the product but avoid committing budget or changing behavior. We need better evidence from recent behavior.');
  await page.locator('input[name="visibility"]').check();
  await page.locator('[data-map-submit]').click();
  await assertVisibleText(page, '[data-map-result]', 'Customer interview map');
  await assertVisibleText(page, '[data-map-result]', 'The Mom Test');

  await page.goto('/community/', { waitUntil: 'domcontentloaded' });
  await assertVisibleText(page, '[data-community-list]', 'Customer interview map');
  await assertVisibleText(page, '[data-community-list]', 'Startup idea validation without fooling yourself');
  await page.locator('[data-community-map="11111111-1111-4111-8111-111111111111"] button').click();
  await assertVisibleText(page, '[data-community-map="11111111-1111-4111-8111-111111111111"]', 'Collected - remove');

  await page.goto('/my-books/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#library-content:not(.hidden)');
  await assertVisibleText(page, '#saved-answer-list', 'How to fix user interviews that are not teaching you anything');
  await assertVisibleText(page, '#user-map-list', 'Customer interview map');
  await assertVisibleText(page, '#collected-map-list', 'Customer interview map');
}

async function clearSupabaseBrowserState(page) {
  await page.waitForLoadState('domcontentloaded');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.evaluate(() => {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('sb-')) localStorage.removeItem(key);
        }
        for (const key of Object.keys(sessionStorage)) {
          if (key.startsWith('sb-')) sessionStorage.removeItem(key);
        }
      });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
      await page.waitForLoadState('domcontentloaded');
    }
  }
}

async function assertNoMobileHeaderOverlap(page) {
  const result = await page.evaluate(() => {
    const pick = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        right: rect.right,
        bottom: rect.bottom,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      };
    };
    const overlap = (a, b) => Boolean(a && b && a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y);
    const brand = pick('.awb-brand');
    const cta = pick('.awb-nav__cta');
    const nav = pick('.awb-nav');
    return {
      brand,
      cta,
      nav,
      overlaps: {
        brandCta: overlap(brand, cta),
        brandNav: overlap(brand, nav),
        ctaNav: overlap(cta, nav),
      },
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  assert.equal(result.overlaps.brandCta, false, 'brand and CTA should not overlap');
  assert.equal(result.overlaps.brandNav, false, 'brand and nav should not overlap');
  assert.equal(result.overlaps.ctaNav, false, 'CTA and nav should not overlap');
  assert.ok(result.scrollWidth <= result.viewportWidth, 'mobile page should not horizontally overflow');
}

async function assertVisibleText(page, selector, text) {
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'visible' });
  await expectText(locator, text instanceof RegExp ? text : new RegExp(escapeRegExp(text), 'i'));
}

async function expectText(locator, pattern) {
  await locator.waitFor({ state: 'visible' });
  const deadline = Date.now() + 3000;
  let value = '';
  while (Date.now() < deadline) {
    value = ((await locator.textContent()) ?? '').trim();
    if (pattern.test(value)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }
  assert.match(value, pattern);
}

async function handleSupabaseRoute(route) {
  const request = route.request();
  const url = new URL(request.url());
  const method = request.method();
  const body = parseJson(request.postData() || '{}');

  if (url.pathname === '/auth/v1/signup' && method === 'POST') {
    activeUser = makeUser(body.email);
    supabaseRequests.push({ kind: 'signup', email: body.email });
    return fulfillJson(route, makeSessionPayload(activeUser));
  }

  if (url.pathname === '/auth/v1/token' && method === 'POST') {
    activeUser = makeUser(body.email || 'reader@example.test');
    supabaseRequests.push({ kind: 'login', email: activeUser.email });
    return fulfillJson(route, makeSessionPayload(activeUser));
  }

  if (url.pathname === '/auth/v1/user' && method === 'GET') {
    return activeUser ? fulfillJson(route, activeUser) : fulfillJson(route, { msg: 'missing session' }, 401);
  }

  if (url.pathname === '/auth/v1/user' && method === 'PUT') {
    activeUser = {
      ...(activeUser ?? makeUser('reader@example.test')),
      user_metadata: body.data ?? body,
    };
    supabaseRequests.push({ kind: 'update-user', metadata: activeUser.user_metadata });
    return fulfillJson(route, activeUser);
  }

  if (url.pathname === '/auth/v1/logout') {
    activeUser = null;
    supabaseRequests.push({ kind: 'logout' });
    return fulfillJson(route, {});
  }

  if (url.pathname === '/rest/v1/profiles') {
    supabaseRequests.push({ kind: 'profile-upsert', method, body });
    return fulfillJson(route, Array.isArray(body) ? body : [body], 201);
  }

  if (url.pathname === '/rest/v1/book_requests' && method === 'GET') return fulfillJson(route, []);

  if (url.pathname === '/rest/v1/book_requests' && method === 'POST') {
    supabaseRequests.push({ kind: 'book-request-insert', method, body });
    return fulfillJson(route, {}, 201);
  }

  if (url.pathname === '/rest/v1/content_feedback' && method === 'POST') {
    supabaseRequests.push({ kind: 'content-feedback-insert', method, body });
    return fulfillJson(route, {}, 201);
  }

  if (url.pathname === '/rest/v1/content_maps') {
    if (method === 'POST') {
      const row = {
        id: '11111111-1111-4111-8111-111111111111',
        author_email: body.author_email ?? activeUser?.email ?? 'reader@example.test',
        title: body.title,
        problem: body.problem,
        source_note: body.source_note ?? '',
        topics: body.topics ?? [],
        books: body.books ?? [],
        answers: body.answers ?? [],
        visibility: body.visibility ?? 'private',
        user_id: body.user_id ?? activeUser?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      remoteContentMaps.unshift(row);
      supabaseRequests.push({ kind: 'content-map-insert', method, body });
      return fulfillJson(route, row, 201);
    }
    if (method === 'GET') {
      const idsFilter = url.searchParams.get('id') ?? '';
      const userFilter = url.searchParams.get('user_id') ?? '';
      let rows = [...remoteContentMaps];
      if (url.searchParams.get('visibility') === 'eq.public') {
        rows = rows.filter((row) => row.visibility === 'public');
      }
      if (userFilter.startsWith('eq.')) {
        rows = rows.filter((row) => row.user_id === userFilter.slice(3));
      }
      if (idsFilter.startsWith('in.(')) {
        const ids = idsFilter.slice(4, -1).split(',').map((id) => id.replace(/^"|"$/g, ''));
        rows = rows.filter((row) => ids.includes(row.id));
      }
      return fulfillJson(route, rows);
    }
  }

  if (url.pathname === '/rest/v1/content_map_collections') {
    if (method === 'POST') {
      const row = {
        id: '22222222-2222-4222-8222-222222222222',
        user_id: body.user_id ?? activeUser?.id,
        content_map_id: body.content_map_id,
        created_at: new Date().toISOString(),
      };
      remoteContentMapCollections.push(row);
      supabaseRequests.push({ kind: 'content-map-collection-insert', method, body });
      return fulfillJson(route, row, 201);
    }
    if (method === 'DELETE') {
      const userFilter = url.searchParams.get('user_id') ?? '';
      const mapFilter = url.searchParams.get('content_map_id') ?? '';
      const userId = userFilter.startsWith('eq.') ? userFilter.slice(3) : '';
      const mapId = mapFilter.startsWith('eq.') ? mapFilter.slice(3) : '';
      for (let index = remoteContentMapCollections.length - 1; index >= 0; index -= 1) {
        if (remoteContentMapCollections[index].user_id === userId && remoteContentMapCollections[index].content_map_id === mapId) {
          remoteContentMapCollections.splice(index, 1);
        }
      }
      return fulfillJson(route, {});
    }
    if (method === 'GET') {
      const userFilter = url.searchParams.get('user_id') ?? '';
      const userId = userFilter.startsWith('eq.') ? userFilter.slice(3) : '';
      return fulfillJson(
        route,
        remoteContentMapCollections.filter((row) => !userId || row.user_id === userId)
      );
    }
  }

  return fulfillJson(route, { ok: true });
}

function makeSessionPayload(user) {
  return {
    access_token: mockAccessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock-refresh-token',
    user,
  };
}

function makeMockAccessToken() {
  const header = toBase64Url({ alg: 'none', typ: 'JWT' });
  const payload = toBase64Url({
    aud: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: '00000000-0000-4000-8000-000000000001',
    email: 'reader@example.test',
    role: 'authenticated',
  });
  return `${header}.${payload}.mock-signature`;
}

function toBase64Url(value) {
  return Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function makeUser(email) {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function fulfillJson(route, payload, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    },
  });
}

function parseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function createStaticServer(directory) {
  return createServer((request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      let filePath = normalize(join(directory, pathname));
      if (!filePath.startsWith(directory)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      if (!existsSync(filePath) && !extname(filePath)) filePath = join(filePath, 'index.html');
      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        response.writeHead(404).end('Not found');
        return;
      }
      response.writeHead(200, { 'content-type': mimeType(filePath) });
      response.end(readFileSync(filePath));
    } catch (error) {
      response.writeHead(500).end(error instanceof Error ? error.message : 'Server error');
    }
  });
}

function mimeType(filePath) {
  const ext = extname(filePath);
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.xml') return 'application/xml; charset=utf-8';
  if (ext === '.txt') return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
