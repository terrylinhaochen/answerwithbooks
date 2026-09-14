import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const templates = [
  ['confirmation', 'Welcome to AWB — verify your email', 'Verify my email'],
  ['magic-link', 'Your AWB verification link', 'Verify and sign in to AWB'],
];
const read = name => readFileSync(new URL(`../supabase/templates/${name}`, import.meta.url), 'utf8');
const documentation = read('README.md');

for (const [name, subject, button] of templates) {
  const html = read(`${name}.html`);
  assert.ok(html.startsWith('<!doctype html>'));
  assert.equal((html.match(/<!doctype html>/g) || []).length, 1);
  assert.equal((html.match(/\{\{ \.ConfirmationURL \}\}/g) || []).length, 1);
  assert.doesNotMatch(html, /token=|token_hash=|127\.0\.0\.1|localhost/);
  assert.match(html, /<table[^>]+align="center"><tr><td align="center"[^>]*><a href="\{\{ \.ConfirmationURL \}\}"/);
  assert.ok(html.includes(`>${button}</a>`));
  assert.ok(html.includes(`<title>${subject}</title>`));
  assert.ok(documentation.includes(subject));
  assert.match(html, /expires shortly and can only be used once/);
  assert.match(html, /safely ignore this email/);
}
assert.match(read('confirmation.html'), /Thanks for subscribing to AWB — Answer with Books\./);
assert.doesNotMatch(read('magic-link.html'), /[Ss]ubscrib/);
console.log('PASS: AWB email copy, centered actions, matching subjects, and unchanged dynamic verification links. Static checks only; no email sent.');
