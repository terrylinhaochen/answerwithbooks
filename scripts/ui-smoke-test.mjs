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
  await testBookPersonalization(page);
  await testBookEditorialSlice(page);
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

  await context.close();
  console.log('UI smoke test passed: skills install, book personalization handoff, legacy redirect, mobile nav, carousel, filters, book requests, saved books, saved answers, onboarding, signup, profile sync, login, email-link callback, signout, content mapping, and community collection verified.');
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
  await page.locator('[data-pagination-next]').click();
  assert.equal(await page.locator('[data-filter-item]:visible').count(), 10);
  assert.equal(await page.locator('[data-book-request-card]').isVisible(), false);
  await page.locator('[data-pagination-next]').click();
  assert.equal(await page.locator('[data-filter-item]:visible').count(), 2);
  assert.equal(await page.locator('[data-book-request-card]').isVisible(), false);
  await page.locator('[data-pagination-prev]').click();
  await page.locator('[data-pagination-prev]').click();
  await page.locator('[data-filter-search]').fill('deep work');
  await expectText(page.locator('[data-filter-count]'), /1 book/);
  await assertVisibleText(page, '[data-filter-list]', 'Deep Work');
  await page.locator('[data-filter-search]').fill('zzzz-no-book');
  await expectText(page.locator('[data-filter-count]'), /0 books/);
}

async function testBookRequest(page) {
  await page.goto('/books/', { waitUntil: 'domcontentloaded' });
  await assertVisibleText(page, '[data-open-book-request]', 'Add a book');
  await page.locator('[data-open-book-request]').click();
  await page.locator('[data-book-request-dialog]').waitFor({ state: 'visible' });
  await page.locator('[data-book-request-form] input[name="title"]').fill('The Design of Everyday Things');
  await page.locator('[data-book-request-form] input[name="author"]').fill('Don Norman');
  await page.locator('[data-book-request-form] textarea[name="note"]').fill('Useful for product and interface decisions.');
  await page.locator('[data-book-request-submit]').click();
  await expectText(page.locator('[data-book-request-status]'), /Request received/);
  await page.locator('[data-close-book-request]').first().click();
  assert.equal(await page.locator('[data-book-request-dialog]').isVisible(), false);
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
  assert.ok(personalizerTop < digestTop, 'personalization should appear before the digest body');
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
  await expectText(page.locator('[data-save-book]'), /Saved - remove/);
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
  assert.equal(await page.locator('[data-source-brief]').evaluate((details) => details.open), true);
  await assertVisibleText(page, '[data-source-brief] .prose-awb', 'Find the broken link before changing the script');
  assert.equal(await page.locator('[data-source-brief] .awb-line-illustration').count(), 1);
  const sourceBrief = await page.locator('[data-source-brief] .prose-awb').innerText();
  assert.doesNotMatch(sourceBrief, /When this lens breaks|Best paired with|Related books/);
  assert.ok(
    await page.locator('[data-source-brief] .prose-awb p').count() >
      await page.locator('[data-source-brief] .prose-awb li').count(),
    'answer source brief should be prose-led rather than list-led'
  );
  await page.locator('[data-copy-agent-prompt]').click();
  await expectText(page.locator('[data-copy-agent-prompt]'), /Copied/);
  const agentPrompt = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(agentPrompt, /Use the installed Answer with Books skill/);
  assert.match(agentPrompt, /how-to-fix-user-interviews-that-are-not-teaching-you-anything/);
  assert.match(agentPrompt, /context you already know about my goals, constraints, prior attempts/);
  await page.locator('[data-save-answer]').click();
  await expectText(page.locator('[data-save-answer]'), /Saved - remove/);
  await page.locator('[data-like-answer]').click();
  await expectText(page.locator('[data-like-answer]'), /Helpful/);

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

  if (url.pathname === '/rest/v1/book_requests' && method === 'POST') {
    supabaseRequests.push({ kind: 'book-request-insert', method, body });
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
