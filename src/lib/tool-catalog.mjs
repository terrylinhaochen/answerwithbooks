export const bookSkillCommand = 'npx answer-with-books install --skill --api';
export const installSkillPath = '/tools/awb-tools/SKILL.md';
export const apiPreviewOrigin = 'http://127.0.0.1:4318';

export const availableTools = [
  { id: 'github-leads', name: 'GitHub lead research', provider: 'GitHub', kind: 'API', description: 'Find relevant builders and projects, with evidence behind each lead.', guide: '/guides/github-lead-research/', example: 'Find developers building inference infrastructure who could benefit from our model-serving platform. Separate project fit from buying intent.' },
  { id: 'x-discourse', name: 'X discourse analysis', provider: 'X', kind: 'API', description: 'Turn recent conversations into sourced themes and useful questions.', guide: '/guides/x-discourse-analysis/', example: 'What recurring frustrations do developers describe about AI coding tools this week? Separate first-hand experience from promotion and reposts.' },
  { id: 'tinker-audience', name: 'Audience enrichment', provider: 'GitHub + Exa', kind: 'API', description: 'Verify GitHub-interest signals and enrich profiles with supporting sources.', scope: 'Currently scoped to Tinker/Cookbook interest.', guide: '/guides/audience-enrichment/', example: 'Build a Tinker/Cookbook-interest audience for a model-training platform campaign. Explain professional fit and missing evidence; return a reviewable table.' },
  { id: 'book-answers', name: 'Book-backed answers', provider: 'AWB shelf', kind: 'Book skill', description: 'Apply useful book ideas to the problem you are working through.', guide: '/books/', example: 'Help me decide what to test before committing to a new product direction. Use relevant books and separate evidence from assumptions.' },
];

export const agentOptions = [
  { id: 'openclaw', name: 'OpenClaw', method: 'skill', available: true },
  { id: 'hermes', name: 'Hermes Agent', method: 'skill', available: true },
  { id: 'claude-ai', name: 'Claude.ai', method: 'upload', available: true },
  { id: 'claude-code', name: 'Claude Code', method: 'skill', available: true },
  { id: 'codex', name: 'Codex', method: 'skill', available: true },
  { id: 'grok-bot', name: 'Grok Bot', method: 'saved-skill', available: true },
  { id: 'opencode', name: 'OpenCode', method: 'skill', available: true },
  { id: 'cursor', name: 'Cursor', method: 'skill', available: true },
  { id: 'other', name: 'Other', method: 'skill', available: true },
];

const categories = {
  'github-leads': ['Growth', 'Sales'],
  'x-discourse': ['Product', 'Marketing'],
  'tinker-audience': ['Growth', 'Research'],
  'book-answers': ['Learning', 'Decisions'],
};

const deliverables = {
  'github-leads': 'A focused shortlist with public profiles, relevant projects, reasons for fit, and questions to investigate next.',
  'x-discourse': 'A sourced briefing of recurring themes, disagreements, and first-hand feedback, with the sample limits made clear.',
  'tinker-audience': 'A reviewable audience table with identity-linked sources, qualification notes, and a spreadsheet-ready export.',
  'book-answers': 'A book-backed perspective on your question, with useful ideas, their limits, and a practical next step.',
};

export function getToolDetail(id) {
  const tool = availableTools.find(item => item.id === id);
  if (!tool) throw new Error('Choose a listed tool.');
  return {
    ...tool, categories: categories[id], deliverable: deliverables[id],
    endpoint: tool.kind === 'API' ? 'POST /v1/run' : null,
    status: tool.kind === 'API' ? 'Local preview' : 'Book skill',
    price: tool.kind === 'API' ? 'Pricing not set' : 'No research API charge',
  };
}

export function getAgentSetup(id, origin) {
  const agent = agentOptions.find(item => item.id === id);
  if (!agent) throw new Error('Choose an agent.');
  return {
    agent,
    instruction: agent.method === 'skill' ? buildInstallInstruction(origin) : null,
    heading: 'Add AWB to your agent',
    guidance: id === 'claude-ai' ? 'Add AWB to your Claude skills.'
      : id === 'grok-bot' ? 'In Grok Bot, paste the setup instructions and ask it to save AWB as a skill.'
      : 'In your agent’s chat, send:',
    note: id === 'cursor' ? 'Use the skill in Cursor’s agent chat. An AWB marketplace plugin is not available yet.'
      : ['claude-ai', 'grok-bot'].includes(id) ? 'Hosted research skills require an invitation during the private preview. Adding the skill does not activate research access.' : '',
  };
}

export function canAdvanceSetup(step, agentId, signedIn) {
  const agent = agentOptions.find(item => item.id === agentId);
  if (!agent || ![0, 1, 2, 3].includes(step)) return false;
  if (step === 0) return true;
  if (!agent.available) return false;
  return step === 1 || signedIn === true;
}

export function buildToolRequest(id) {
  const tool = getToolDetail(id);
  if (!tool.endpoint) throw new Error('Book-backed answers use the separate book skill.');
  return { capability: tool.id, request: tool.example };
}

const shellContinue = ' \\' + '\n';
export const inspectApiCommand = [
  'curl --fail-with-body "$CAPABILITY_BASE_URL/v1/capabilities"',
  '  -H "Authorization: Bearer $CAPABILITY_API_KEY"',
].join(shellContinue);

export const pollApiCommand = [
  'curl --fail-with-body "$CAPABILITY_BASE_URL/v1/runs/REPLACE_WITH_RUN_ID"',
  '  -H "Authorization: Bearer $CAPABILITY_API_KEY"',
].join(shellContinue);

export function buildApiCommand(id) {
  const body = JSON.stringify(buildToolRequest(id)).replaceAll("'", "'\\''");
  return [
    'REQUEST_ID="$(uuidgen)"',
    [
      'curl --fail-with-body -X POST "$CAPABILITY_BASE_URL/v1/run"',
      '  -H "Authorization: Bearer $CAPABILITY_API_KEY"',
      '  -H "Content-Type: application/json"',
      '  -H "Idempotency-Key: $REQUEST_ID"',
      `  -d '${body}'`,
    ].join(shellContinue),
  ].join('\n');
}

export function buildCliCommand(id) {
  const tool = getToolDetail(id);
  if (!tool.endpoint) return bookSkillCommand;
  return `npm run call -- ${tool.id} '${tool.example.replaceAll("'", "'\\''")}'`;
}

export function buildInstallInstruction(origin = 'https://answerwithbooks.com') {
  const base = new URL(origin);
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname);
  if (base.username || base.password || !(base.protocol === 'https:' || (base.protocol === 'http:' && loopback))) {
    throw new Error('Use HTTPS, or a local preview address.');
  }
  return `Set up ${new URL(installSkillPath, base.origin).href}`;
}

export function buildExamplePrompt(id) {
  const tool = availableTools.find(item => item.id === id);
  if (!tool) throw new Error('Choose a listed tool.');
  const route = tool.kind === 'API'
    ? `Use the AWB skill to call ${tool.id}. Check that research access is available before starting. If it is not connected, explain what is missing instead of simulating a result.`
    : `Use the AWB book skill. If it is not installed, explain the setup needed. This task uses the published book shelf and does not require research access.`;
  return `${route}\n\n${tool.example}\n\nReturn sources and limitations. Do not send outreach or publish to another system.`;
}
