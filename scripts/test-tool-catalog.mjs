import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { availableTools, bookSkillCommand, installSkillPath, apiPreviewOrigin, buildInstallInstruction, buildExamplePrompt, agentOptions, getAgentSetup, canAdvanceSetup, getToolDetail, buildToolRequest, buildApiCommand, buildCliCommand, inspectApiCommand, pollApiCommand } from '../src/lib/tool-catalog.mjs';
import { toolsAuthPaths, readToolsAuthContext, isVerifiedToolsUser } from '../src/lib/tools-auth.mjs';
const built = file => path.join(process.env.AWB_TEST_DIST || 'dist', file);

const apiIds = ['github-leads', 'x-discourse', 'tinker-audience'];
assert.deepEqual(availableTools.filter(tool => tool.kind === 'API').map(tool => tool.id), apiIds);
assert.equal(new Set(availableTools.map(tool => tool.id)).size, 4);
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
  if (tool.kind === 'API') assert.ok(example.includes(`select ${tool.id}`));
  else assert.match(example, /not the research API/);
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
assert.match(getAgentSetup('claude-ai').note, /reachable HTTPS API/);
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
for (const id of apiIds) {
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
const original = availableTools[0].example;
try {
  availableTools[0].example = "Find developers whose project's focus is infrastructure; do not run $(anything).";
  assert.deepEqual(JSON.parse(captureShell(buildApiCommand('github-leads'), 'curl').at(-1)), buildToolRequest('github-leads'));
  assert.equal(captureShell(buildCliCommand('github-leads'), 'npm').at(-1), availableTools[0].example);
} finally { availableTools[0].example = original; }
assert.ok(captureShell(inspectApiCommand, 'curl').includes(`${apiPreviewOrigin}/v1/capabilities`));
assert.ok(captureShell(pollApiCommand, 'curl').includes(`${apiPreviewOrigin}/v1/runs/REPLACE_WITH_RUN_ID`));

const html = fs.readFileSync(built('tools/index.html'), 'utf8');
assert.match(html, /One API\. One setup\./);
assert.equal((html.match(/<button\b[^>]*data-copy-install/g) || []).length, 1);
assert.equal((html.match(/<article\b[^>]*data-capability=/g) || []).length, 4);
assert.equal((html.match(/<main\b/g) || []).length, 1, 'Single page landmark');
assert.ok(html.includes(`href="${installSkillPath}"`));
assert.ok(html.includes(buildInstallInstruction()));
assert.ok(html.includes('POST /v1/run'));
const mainInstall = html.split('id="install"')[1].split('</section>')[0];
assert.doesNotMatch(mainInstall, /data-copy-install|POST \/v1\/run|One platform key|Local API preview|View skill/);
assert.ok(html.includes('id="book-skill"'), 'Existing homepage link still resolves');
for (const removed of ['data-agent-task-form', 'id="models"', 'id="source-tools"', 'data-book-skill-panel']) assert.ok(!html.includes(removed));
assert.doesNotMatch(html, /name="api.?key"/i, 'Do not collect provider credentials');
const secretInputs = html.match(/<input\b[^>]*type="password"[^>]*>/g) || [];
assert.equal(secretInputs.length, 3, 'Two account password inputs and one readonly generated key display');
const keyDisplay = secretInputs.find(input => input.includes('data-key-secret'));
assert.match(keyDisplay, /readonly/);
assert.ok(secretInputs.some(input => input.includes('autocomplete="new-password"')));
assert.ok(secretInputs.some(input => input.includes('autocomplete="current-password"')));
assert.doesNotMatch(html, /Download skill instructions/);
assert.doesNotMatch(html, /Social sign-in is coming soon/);
for (const provider of ['github', 'google']) assert.ok(html.includes(`data-oauth-provider="${provider}"`));
const dialogSource = fs.readFileSync('src/components/ToolDialogs.astro', 'utf8');
assert.match(dialogSource, /html:has\(dialog\[data-tools-dialog\]\[open\]\)/, 'Lock background scrolling only while a tools modal is open');
assert.match(dialogSource, /\.tools-dialog\{scrollbar-width:none/);
assert.match(dialogSource, /overflow:auto;overscroll-behavior:contain/, 'Keep modal content scrollable');
assert.match(html, /href="\/tools\/awb-tools.zip"/);
for (const { id } of agentOptions) assert.ok(html.includes(`data-agent-icon="${id}"`));
assert.doesNotMatch(html, /<small[^>]*>Coming soon/);
assert.ok(fs.readFileSync(built('skills/index.html'), 'utf8').includes('/tools/'));
assert.equal(fs.readFileSync(built(installSkillPath), 'utf8'), skill, 'Setup URL serves the actual skill');
const source = fs.readFileSync('src/pages/tools.astro', 'utf8');
const client = fs.readFileSync('src/lib/tools-page.ts', 'utf8');
assert.doesNotMatch(source + client, /fetch\(|localStorage|sessionStorage/);
assert.match(client, /manual\.value = value/);
assert.match(client, /manual\.select\(\)/);
assert.match(client, /dialog\.showModal\(\)/);
assert.match(client, /ArrowRight/);
assert.match(client, /ArrowLeft/);
assert.doesNotMatch(html, /powered by Fireworks|fireworks\.svg|Research reasoning powered/i);
assert.equal((html.match(/<input\b[^>]*name="tools-agent"/g) || []).length, 9);
assert.equal((html.match(/<section\b[^>]*data-setup-step=/g) || []).length, 4);
assert.equal((html.match(/<dialog\b[^>]*data-tool-detail=/g) || []).length, 4);
assert.equal((html.match(/<button\b[^>]*data-open-tool=/g) || []).length, 4);
assert.equal((html.match(/role="tabpanel"/g) || []).length, 12);
assert.equal((html.match(/role="tab"/g) || []).length, 12);
for (const { id } of availableTools) for (let tab = 0; tab < 3; tab++) {
  assert.ok(html.includes(`aria-controls="${id}-panel-${tab}"`));
  assert.ok(html.includes(`id="${id}-panel-${tab}"`));
  assert.ok(html.includes(`aria-labelledby="${id}-tab-${tab}"`));
}
assert.match(html, /Research API access is in private preview and is separate from account signup/);
assert.match(html, /Pricing not set/);
assert.doesNotMatch(html, /Connect your API|I’ve configured the API|data-api-ack|page does not verify the connection/);
assert.equal((html.match(/data-try-tool=/g) || []).length, 4);
assert.match(html, /data-tools-auth-mode="signup"/);
assert.match(html, /data-tools-auth-mode="login"/);
assert.match(client, /supabase\.auth\.getUser\(\)/);
assert.match(client, /isVerifiedToolsUser\(result\.data\.user\)/);
assert.match(fs.readFileSync('src/lib/tool-auth-form.ts', 'utf8'), /shouldCreateUser: false/);
assert.match(fs.readFileSync('src/pages/auth/confirm.astro', 'utf8'), /toolsContext\?\.returnTo \|\| '\/profile\/'/);
assert.match(fs.readFileSync('src/lib/newsletter-flow.ts', 'utf8'), /readToolsAuthContext\(location\.pathname, location\.search\)\?\.confirm/);
console.log(JSON.stringify({ passed: true, listedTools: 4, apiCapabilities: 3, agentOptions: 9, setupSteps: 4, detailPanels: 4, instructionTabs: 12, shellExamplesMockTested: true, originAwareSetup: true, installDocumentPackaged: true, bookSetupPreserved: true, browserInteractionTested: false, paidProviderCalls: 0 }, null, 2));
