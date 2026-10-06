import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { availableTools, bookSkillCommand, installSkillPath, apiPreviewOrigin, buildInstallInstruction, buildExamplePrompt, agentOptions, getAgentSetup, canAdvanceSetup, getToolDetail, buildToolRequest, buildApiCommand, buildCliCommand, inspectApiCommand, pollApiCommand } from '../src/lib/tool-catalog.mjs';
import { toolsAuthPaths, readToolsAuthContext, isVerifiedToolsUser } from '../src/lib/tools-auth.mjs';
const built = file => path.join(process.env.AWB_TEST_DIST || 'dist', file);

const apiIds = ['github-leads', 'x-discourse', 'tinker-audience', 'product-feedback-analysis'];
assert.deepEqual(availableTools.filter(tool => tool.kind === 'API').map(tool => tool.id), apiIds);
assert.equal(new Set(availableTools.map(tool => tool.id)).size, 5);
for (const origin of ['http://127.0.0.1:4321', 'http://localhost:4321', 'http://[::1]:4321', 'https://answerwithbooks.com', 'https://preview.example.com']) {
  assert.equal(buildInstallInstruction(origin), `Set up ${origin}${installSkillPath}`);
}
for (const bad of ['https://user:secret@example.com', 'http://example.com', 'javascript:alert(1)', 'file:///tmp/skill', 'not a URL']) {
  assert.throws(() => buildInstallInstruction(bad));
}
assert.equal(buildInstallInstruction('https://answerwithbooks.com/other?q=test#hash'), `Set up https://answerwithbooks.com${installSkillPath}`);
const skill = fs.readFileSync(`public${installSkillPath}`, 'utf8');
assert.ok(skill.startsWith('---\nname: awb-tools\ndescription: '));
assert.ok(skill.includes(bookSkillCommand), 'Book installation remains available in the shared setup');
assert.ok(skill.includes(apiPreviewOrigin));
for (const id of apiIds) assert.ok(skill.includes('`' + id + '`'));
assert.match(skill, /General audience enrichment is not implemented as an API capability/);
assert.match(skill, /Do not run paid research merely to test installation/);
assert.match(skill, /refuse cross-origin redirects/);
assert.match(skill, /Do not request credentials in chat/);
assert.match(skill, /save this document as `awb-tools\/SKILL.md`/);

for (const tool of availableTools) {
  const example = buildExamplePrompt(tool.id);
  assert.ok(example.includes(tool.example));
  if (tool.kind === 'API') assert.ok(example.includes(`call ${tool.id}`));
  else assert.match(example, /does not require research access/);
  assert.match(example, /Do not send outreach or publish/);
  assert.ok(fs.existsSync(built(`${tool.guide}index.html`)), 'Guide or book route exists');
}
assert.throws(() => buildExamplePrompt('auto'));
assert.throws(() => buildExamplePrompt('audience-enrichment'));

assert.deepEqual(agentOptions.map(agent => agent.name), ['OpenClaw', 'Hermes Agent', 'Claude.ai', 'Claude Code', 'Codex', 'Grok Bot', 'OpenCode', 'Cursor', 'Other']);
for (const agent of agentOptions) {
  const info = getAgentSetup(agent.id, 'http://127.0.0.1:4321');
  assert.equal(info.agent.id, agent.id);
  if (agent.method === 'skill') assert.ok(info.instruction.includes('http://127.0.0.1:4321/tools/awb-tools/SKILL.md'));
  else assert.equal(info.instruction, null);
  assert.ok(canAdvanceSetup(0, agent.id, false));
  assert.equal(canAdvanceSetup(1, agent.id, false), agent.available);
  assert.equal(canAdvanceSetup(2, agent.id, false), false);
  assert.equal(canAdvanceSetup(2, agent.id, true), agent.available);
  assert.equal(canAdvanceSetup(3, agent.id, true), agent.available);
  assert.equal(canAdvanceSetup(3, agent.id, 'true'), false);
  assert.equal(canAdvanceSetup(3, agent.id, false), false);
}
assert.equal(getAgentSetup('claude-ai').agent.method, 'upload');
assert.equal(getAgentSetup('grok-bot').agent.method, 'saved-skill');
assert.match(getAgentSetup('claude-ai').note, /require an invitation/);
assert.match(getAgentSetup('cursor').note, /marketplace plugin is not available yet/);
for (const agent of agentOptions.filter(agent => agent.available)) {
  const paths = toolsAuthPaths(agent.id);
  assert.equal(paths.confirm, `/auth/confirm/?from=tools&agent=${agent.id}`);
  for (const path of [paths.confirm, paths.returnTo]) {
    const url = new URL(path, 'https://answerwithbooks.com');
    assert.deepEqual(readToolsAuthContext(url.pathname, url.search), { ...paths, agentId: agent.id });
  }
}
for (const agent of ['', null, 'https://evil.example/', '../profile']) assert.equal(toolsAuthPaths(agent), null);
for (const [path, search] of [['/profile/', '?setup=try&agent=codex'], ['/tools/', '?agent=codex'], ['/auth/confirm/', '?from=other&agent=codex'], ['/tools/', '?setup=try&agent=https://evil.example/']]) assert.equal(readToolsAuthContext(path, search), null);
assert.equal(readToolsAuthContext('/tools/', '?setup=try&agent=codex&returnTo=https://evil.example/').returnTo, '/tools/?setup=try&agent=codex');
for (const user of [null, {}, { id: 'u' }, { id: 'u', email_confirmed_at: '' }, { id: 'u', email_confirmed_at: '2026-09-11', is_anonymous: true }]) assert.equal(isVerifiedToolsUser(user), false);
assert.equal(isVerifiedToolsUser({ id: 'u', email_confirmed_at: '2026-09-11', is_anonymous: false }), true);
assert.equal(canAdvanceSetup(0, '', false), false);
assert.equal(canAdvanceSetup(1, 'unlisted', true), false);
assert.equal(canAdvanceSetup(99, 'codex', true), false);
assert.throws(() => getAgentSetup('unlisted'));
assert.throws(() => getToolDetail('unlisted'));
assert.throws(() => buildToolRequest('book-answers'));
assert.equal(getToolDetail('book-answers').endpoint, null);
assert.equal(buildCliCommand('book-answers'), bookSkillCommand);

// Exercise copied shell commands with fake curl/npm functions: no network or paid calls.
function captureShell(command, program) {
  const harness = `${program}() { '${process.execPath}' -e 'process.stdout.write(JSON.stringify(process.argv.slice(1)))' -- "$@"; };\nuuidgen() { printf '00000000-0000-4000-8000-000000000001'; };\n`;
  const result = spawnSync('/bin/bash', ['-c', harness + command], { encoding: 'utf8', env: { PATH: '/usr/bin:/bin', CAPABILITY_BASE_URL: apiPreviewOrigin, CAPABILITY_API_KEY: 'test-only-platform-key' } });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}
for (const id of apiIds.filter(id => id !== 'product-feedback-analysis')) {
  const detail = getToolDetail(id);
  assert.equal(detail.endpoint, 'POST /v1/run');
  assert.equal(detail.price, 'Pricing not set');
  assert.ok(detail.categories.length > 0);
  const args = captureShell(buildApiCommand(id), 'curl');
  assert.ok(args.includes(`${apiPreviewOrigin}/v1/run`));
  assert.ok(args.includes('Authorization: Bearer test-only-platform-key'));
  assert.ok(args.includes('Idempotency-Key: 00000000-0000-4000-8000-000000000001'));
  assert.deepEqual(JSON.parse(args[args.indexOf('-d') + 1]), buildToolRequest(id));
  assert.equal(args.includes('+'), false, 'No stray continuation characters');
  assert.deepEqual(captureShell(buildCliCommand(id), 'npm'), ['run', 'call', '--', id, detail.example]);
}
assert.throws(() => buildToolRequest('product-feedback-analysis'), /authorized original feedback/);
assert.throws(() => buildCliCommand('product-feedback-analysis'), /structured feedback/);
const feedback = [{ id: 'source-1', text: 'An authorized original quote.', sourceType: 'customer_feedback' }];
assert.deepEqual(buildToolRequest('product-feedback-analysis', feedback).feedback, feedback);
const original = availableTools[0].example;
try {
  availableTools[0].example = "Find developers whose project's focus is infrastructure; do not run $(anything).";
  assert.deepEqual(JSON.parse(captureShell(buildApiCommand('github-leads'), 'curl').at(-1)), buildToolRequest('github-leads'));
  assert.equal(captureShell(buildCliCommand('github-leads'), 'npm').at(-1), availableTools[0].example);
} finally { availableTools[0].example = original; }
assert.ok(captureShell(inspectApiCommand, 'curl').includes(`${apiPreviewOrigin}/v1/capabilities`));
assert.ok(captureShell(pollApiCommand, 'curl').includes(`${apiPreviewOrigin}/v1/runs/REPLACE_WITH_RUN_ID`));

// The old rendered-directory assertions are preserved in integrations/crowdlisten-skills-directory.
// Shared legacy contracts stay tested while AWB's public surface focuses on books.
const html = fs.readFileSync(built('tools/index.html'), 'utf8');
assert.match(html, /Give your agent/);
assert.ok(html.includes('id="book-skill"'));
assert.equal((html.match(/<button\b[^>]*data-copy-example/g) || []).length, 6);
assert.equal((html.match(/data-capability=/g) || []).length, 0);
assert.equal((html.match(/<main\b/g) || []).length, 1);
assert.doesNotMatch(html, /name="api.?key"/i);
assert.ok(fs.readFileSync(built('skills/index.html'), 'utf8').includes('/tools/'));
assert.equal(fs.readFileSync(built(installSkillPath), 'utf8'), skill, 'Legacy setup URL still serves its skill');
assert.ok(fs.existsSync(built('tools/awb-tools.zip')), 'Legacy ZIP remains available');
console.log('PASS shared capability contracts, safe commands, book-focused page, and retained legacy skill downloads.');
