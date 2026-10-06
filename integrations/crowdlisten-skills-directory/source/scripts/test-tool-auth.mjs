import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validateToolSignup, createToolAccount } from '../src/lib/tool-auth-client.mjs';
import { packageToolSkill, grokSkillSetup } from '../src/lib/tool-skill-package.mjs';

const fields = { email: ' Demo@Example.com ', password: 'test-password-only', firstName: ' Demo ', lastName: 'Reader', username: 'demo_reader', consent: true };
const redirectTo = 'http://127.0.0.1:4332/auth/confirm/?from=tools&agent=claude-ai';
assert.equal(validateToolSignup(fields).email, 'demo@example.com');
assert.equal(validateToolSignup(fields).firstName, 'Demo');
for (const change of [{ consent: false }, { password: 'short' }, { email: 'bad' }, { username: 'x' }, { firstName: '' }]) assert.throws(() => validateToolSignup({ ...fields, ...change }));
let signups = [];
let subscriptions = [];
const deps = { fields, redirectTo, auth: { signUp: async value => { signups.push(value); return { data: { session: null }, error: null }; } }, registerNewsletter: async email => subscriptions.push(email) };
assert.equal((await createToolAccount(deps)).state, 'confirmation');
assert.deepEqual(subscriptions, ['demo@example.com']);
assert.equal(signups[0].options.emailRedirectTo, redirectTo);
assert.deepEqual(signups[0].options.data, { first_name: 'Demo', last_name: 'Reader', username: 'demo_reader' });
assert.ok(!JSON.stringify(signups[0].options.data).includes(fields.password));
await assert.rejects(createToolAccount({ ...deps, redirectTo: 'javascript:alert(1)' }));
await assert.rejects(createToolAccount({ ...deps, redirectTo: 'https://example.com/elsewhere/' }));
signups = [];
const failedStore = await createToolAccount({ ...deps, registerNewsletter: async () => { throw new Error('server failure'); } });
assert.equal(failedStore.state, 'error');
assert.equal(signups.length, 0, 'Failed newsletter persistence must not silently create an account');
assert.equal((await createToolAccount({ ...deps, auth: { signUp: async () => ({ data: { session: { id: 'test' } } }) } })).state, 'signed-in');
for (const auth of [{ signUp: async () => ({ error: { status: 429 } }) }, { signUp: async () => { throw new Error('private provider diagnostic'); } }]) {
  const result = await createToolAccount({ ...deps, auth });
  assert.equal(result.state, 'error'); assert.match(result.message, /newsletter signup is saved/);
  assert.doesNotMatch(result.message, /private provider diagnostic/);
}

const skill = readFileSync('public/tools/awb-tools/SKILL.md', 'utf8');
const zip = packageToolSkill(skill);
// Validate with an independent ZIP reader in memory: no cache or artifact writes.
const checked = spawnSync('/usr/bin/python3', ['-c', 'import io,sys,zipfile,json; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); print(json.dumps({"names":z.namelist(),"content":z.read("awb-tools/SKILL.md").decode(),"bad":z.testzip()}))'], { input: zip, encoding: 'utf8' });
assert.equal(checked.status, 0, checked.stderr);
const archive = JSON.parse(checked.stdout);
assert.deepEqual(archive.names, ['awb-tools/SKILL.md']); assert.equal(archive.content, skill); assert.equal(archive.bad, null);
assert.match(grokSkillSetup(skill), /Do not run a paid research task/);
assert.ok(grokSkillSetup(skill).endsWith(skill));
console.log(JSON.stringify({ passed: true, signupValidation: true, authRequestAndMetadata: true, partialFailure: true, zipIndependentlyValidated: true, liveAccountsCreated: 0 }));
