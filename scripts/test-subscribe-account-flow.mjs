import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const base = 'http://127.0.0.1:4321';
const flowKey = 'awb:signup-flow:v1';
const requests = [];
const errors = [];
const page = await browser.newPage();
page.on('pageerror', e => errors.push(e.message));
let otpStatus = 200;
let subscribedStatus = 202;
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'reader@example.com', email_confirmed_at: new Date().toISOString(), app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {}, identities: [], created_at: new Date().toISOString() };
await page.route('https://*.supabase.co/**', async route => {
  const path = new URL(route.request().url()).pathname;
  const body = route.request().postDataJSON();
  requests.push({ path, body, url: route.request().url() });
  let status = 200;
  let data = {};
  if (path.endsWith('/newsletter-signup')) { status = subscribedStatus; data = { accepted: status === 202 }; }
  else if (path.endsWith('/otp')) { status = otpStatus; data = status === 200 ? {} : { error_code: 'over_email_send_rate_limit', msg: 'Test email rate limit' }; }
  else if (path.endsWith('/user')) data = user;
  else if (path.startsWith('/rest/')) data = [];
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
});
const root = () => page.locator('.newsletter-signup [data-newsletter-email]');
async function reset(path = '/') {
  await page.goto(base + path);
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.reload();
  requests.length = 0;
  otpStatus = 200; subscribedStatus = 202;
}
async function subscribe(email = 'reader@example.com') {
  await root().getByRole('textbox', { name: 'Email address' }).fill(email);
  await root().getByRole('button', { name: 'Subscribe', exact: true }).click();
  await root().locator('[data-account-step]').waitFor();
  assert.equal(await root().getAttribute('data-signup-stage'), 'account');
}
try {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 950 });
    await reset();
    await subscribe();
    assert.equal(requests.filter(r => r.path.endsWith('/newsletter-signup')).length, 1);
    assert.equal(requests.filter(r => r.path.endsWith('/otp')).length, 0, 'No account created without activation');
    await page.locator('header [data-open-newsletter]').click();
    const modal = page.locator('[data-newsletter-modal]');
    assert.equal(await modal.locator('[data-newsletter-email]').getAttribute('data-signup-stage'), 'account');
    assert.equal(await modal.getByRole('textbox', { name: 'Email address' }).count(), 0, 'No second email entry');
    await modal.locator('[data-activate-account]').click();
    await page.waitForFunction(() => document.querySelector('[data-newsletter-email]').dataset.signupStage === 'sent');
    const otp = requests.filter(r => r.path.endsWith('/otp'));
    assert.equal(otp.length, 1);
    assert.equal(otp[0].body.email, 'reader@example.com');
    assert.equal(otp[0].body.create_user, true, 'Same endpoint supports new and existing accounts');
    assert.equal(new URL(otp[0].url).searchParams.get('redirect_to'), base + '/auth/confirm/');
    assert.ok(!page.url().includes('reader'));
    assert.equal(await modal.locator('[data-activate-account]').isDisabled(), true);
    await page.screenshot({ path: `/tmp/awb-account-sent-${width}.jpg`, type: 'jpeg', quality: 75 });
    await page.keyboard.press('Escape');
    await page.reload();
    assert.equal(await root().getAttribute('data-signup-stage'), 'sent', 'Reload keeps step in this tab');
    assert.equal(requests.filter(r => r.path.endsWith('/otp')).length, 1, 'No resend on reload');
    await root().locator('[data-skip-account]').click();
    assert.equal(await root().getAttribute('data-signup-stage'), 'done');
    assert.equal(await root().getByRole('link', { name: 'Explore guides' }).getAttribute('href'), '/guides/');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

    await reset('/newsletter/');
    await subscribe('returning@example.com');
    otpStatus = 429;
    await root().locator('[data-activate-account]').click();
    await root().locator('[data-account-status]').filter({ hasText: 'Too many email requests' }).waitFor();
    assert.equal(await root().getAttribute('data-signup-stage'), 'account');
    assert.equal(requests.filter(r => r.path.endsWith('/newsletter-signup')).length, 1);
    await page.evaluate(key => { const s = JSON.parse(sessionStorage.getItem(key)); s.resendAt = 0; sessionStorage.setItem(key, JSON.stringify(s)); }, flowKey);
    otpStatus = 200;
    await page.reload();
    await root().locator('[data-activate-account]').click();
    await root().locator('[data-account-title]').filter({ hasText: 'Check your email' }).waitFor();
    assert.equal(requests.filter(r => r.path.endsWith('/otp')).at(-1).body.email, 'returning@example.com');
    assert.equal(requests.filter(r => r.path.endsWith('/newsletter-signup')).length, 1, 'Retry never resubscribes');
    await root().locator('[data-signup-reset]').click();
    assert.equal(await root().getAttribute('data-signup-stage'), 'email');
    assert.equal(await root().getByRole('textbox', { name: 'Email address' }).inputValue(), '');
    assert.equal(await page.evaluate(key => sessionStorage.getItem(key), flowKey), null);
    await subscribe('skip@example.com');
    const beforeSkip = requests.length;
    await root().locator('[data-skip-account]').click();
    assert.equal(requests.length, beforeSkip, 'Skip performs no auth request');

    await reset();
    subscribedStatus = 503;
    await root().getByRole('textbox', { name: 'Email address' }).fill('retry@example.com');
    await root().getByRole('button', { name: 'Subscribe', exact: true }).click();
    await root().locator('[data-newsletter-status]').filter({ hasText: 'could not save' }).waitFor();
    assert.equal(await root().locator('[data-account-step]').isVisible(), false);
    assert.equal(await root().getByRole('textbox', { name: 'Email address' }).inputValue(), 'retry@example.com');
  }

  // Exercise the actual callback component with a mocked Auth service, not real tokens/users.
  await reset();
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, aud: 'authenticated', exp: Math.floor(Date.now()/1000)+3600 })}.test-signature`;
  await page.goto(`${base}/auth/confirm/#access_token=${token}&refresh_token=test-only&type=magiclink`);
  await page.getByRole('heading', { name: 'Your account is ready.' }).waitFor();
  assert.equal(page.url(), base + '/auth/confirm/', 'Auth tokens stripped from URL');
  assert.equal(await page.getByRole('link', { name: 'Open my shelf', exact: true }).getAttribute('href'), '/my-books/');
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), flowKey), null);
  assert.ok(requests.some(r => r.path.endsWith('/user')), 'Account checked with Auth server');
  await page.goto('about:blank');
  await page.goto(base + '/auth/confirm/#error=access_denied&error_description=Expired');
  await page.getByRole('heading', { name: 'Let’s try a fresh link.' }).waitFor();
  assert.equal(page.url(), base + '/auth/confirm/');
  assert.equal(await page.getByRole('link', { name: 'Request a new link', exact: true }).getAttribute('href'), '/login/');
  await reset();
  await page.evaluate(key => sessionStorage.setItem(key, JSON.stringify({ email: 'old@example.com', stage: 'sent', savedAt: Date.now()-31*60000, resendAt: 0 })), flowKey);
  await page.reload();
  assert.equal(await root().getAttribute('data-signup-stage'), 'email', 'Expired tab state is discarded');
  // Returning users can request a link without subscribing again or creating an account.
  await reset('/login/');
  assert.equal(await page.locator('#password').isVisible(), false);
  await page.locator('#email').fill('returning@example.com');
  await page.getByRole('button', { name: 'Send sign-in link', exact: true }).click();
  await page.locator('#form-message').filter({ hasText: 'If this email has an AWB account' }).waitFor();
  assert.equal(requests.filter(r => r.path.endsWith('/newsletter-signup')).length, 0);
  const loginOtp = requests.find(r => r.path.endsWith('/otp'));
  assert.equal(loginOtp.body.email, 'returning@example.com');
  assert.equal(loginOtp.body.create_user, false);
  assert.equal(await page.locator('#submit-btn').isDisabled(), true);
  await page.locator('[data-login-mode]').click();
  assert.equal(await page.locator('#email').inputValue(), 'returning@example.com');
  assert.equal(await page.locator('#password').isVisible(), true);
  assert.equal(await page.locator('#submit-btn').isEnabled(), true);
  await page.locator('#password').fill('old-test-password');
  await page.route('**/auth/v1/token?grant_type=password', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'invalid_credentials', msg: 'Invalid login credentials' }) }));
  await page.locator('#submit-btn').click();
  await page.locator('#form-message').filter({ hasText: 'couldn’t log you in' }).waitFor();
  assert.equal(await page.locator('#submit-btn').isEnabled(), true);
  await page.unroute('**/auth/v1/token?grant_type=password');
  await page.route('**/auth/v1/token?grant_type=password', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: token, refresh_token: 'test-password-refresh', token_type: 'bearer', expires_in: 3600, user }) }));
  await page.locator('#submit-btn').click();
  await page.waitForURL('**/profile/');
  assert.equal(requests.filter(r => r.path.endsWith('/newsletter-signup')).length, 0, 'Password login does not resubscribe');
  assert.deepEqual(errors, []);


  console.log(JSON.stringify({ passed: true, desktopMobile: true, sameEmail: true, inlineModalSync: true, newReturningAccounts: true, skip: true, retryCooldown: true, callback: true, expiredLink: true, temporaryState: true, network: 'Auth and newsletter mocked; no email sent and no account created' }, null, 2));
} finally { await browser.close(); }
