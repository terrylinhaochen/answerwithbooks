import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const answersDir = path.join(root, 'src/content/answers');
const outDirArg = process.argv.find((arg) => arg.startsWith('--out-dir='));
const outputDir = path.join(root, outDirArg?.split('=').slice(1).join('=') ?? 'public/answer-covers');
const providerArg = process.argv.find((arg) => arg.startsWith('--provider='));
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const idsArg = process.argv.find((arg) => arg.startsWith('--ids='));
const provider = providerArg?.split('=')[1] ?? process.env.ANSWER_COVER_PROVIDER ?? 'gemini';
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
const selectedIds = idsArg ? new Set(idsArg.split('=').slice(1).join('=').split(',').filter(Boolean)) : null;
const geminiImageMime = process.env.GEMINI_IMAGE_MIME || 'image/jpeg';
const geminiImageExtension = geminiImageMime === 'image/png' ? 'png' : 'jpg';
const geminiKeyEnvPaths = [
  path.join(root, '.env'),
  '/Users/terry/Desktop/crowdlisten_files/platform/crowdlisten_deployed/frontend/.env.local',
  '/Users/terry/Desktop/crowdlisten_files/platform/crowdlisten_agent/crowdlisten-agent/.env',
  '/Users/terry/Desktop/crowdlisten_files/.env',
];

const palettes = [
  { bg: '#0b6bdc', ink: '#fffaf0', accent: '#43f5ff', warm: '#ffd447', dim: '#083b78', name: 'electric blue' },
  { bg: '#d8326f', ink: '#fff8ee', accent: '#ffd447', warm: '#ff8a1f', dim: '#8f1249', name: 'raspberry pink' },
  { bg: '#008c66', ink: '#fffaf0', accent: '#d7ff3f', warm: '#ff7a1a', dim: '#07553f', name: 'bright green' },
  { bg: '#6a24d8', ink: '#fffefa', accent: '#b7ff1f', warm: '#ff8a1f', dim: '#3d1288', name: 'saturated purple' },
  { bg: '#f23a1f', ink: '#fff9ea', accent: '#15d0c8', warm: '#ffd447', dim: '#a91f10', name: 'vermilion red' },
  { bg: '#ffc21a', ink: '#211a00', accent: '#1647d9', warm: '#0a8f74', dim: '#d69300', name: 'sunflower yellow' },
  { bg: '#17206f', ink: '#fffaf0', accent: '#ff8a1f', warm: '#c8ff2d', dim: '#080b2a', name: 'indigo navy' },
  { bg: '#008c8c', ink: '#fffaf0', accent: '#ff8a1f', warm: '#ffffff', dim: '#052d2d', name: 'bright teal' },
];

const iconByTopic = {
  career: 'compass',
  management: 'ladder',
  communication: 'dialogue',
  conflict: 'dialogue',
  startups: 'spark',
  validation: 'spark',
  metrics: 'signal',
  analytics: 'signal',
  productivity: 'blocks',
  focus: 'blocks',
  decision: 'fork',
  'decision-making': 'fork',
  judgment: 'fork',
  technology: 'grid',
  design: 'grid',
  negotiation: 'balance',
  health: 'loop',
  habits: 'loop',
  strategy: 'target',
};

const symbolByIcon = {
  balance: 'one balanced scale made from two bold circles and a clean center beam',
  blocks: 'three oversized blocks snapping into a clean finished shape',
  compass: 'one compass needle inside a simple path ring',
  dialogue: 'two speech-stone shapes meeting without any text or bubbles containing marks',
  fork: 'one road splitting into two bold paths with a clear decision node',
  grid: 'four clean interface tiles reorganizing into one obvious layout',
  ladder: 'one sturdy ladder with two highlighted rungs',
  loop: 'one loop arrow wrapping a small seed or habit marker',
  signal: 'three bold signal bars and one clean trend curve, no numbers',
  spark: 'one bright spark hitting a small test object',
  target: 'one clean target with a single arrow entering from the side',
};

const labelByAnswer = {
  'how-to-decide-what-to-do-with-your-career-next': 'Career Move',
  'how-to-delegate-without-losing-control': 'Delegate',
  'how-to-explain-an-idea-so-people-remember-it': 'Make It Stick',
  'how-to-fix-user-interviews-that-are-not-teaching-you-anything': 'User Interviews',
  'how-to-get-out-of-task-overwhelm-without-reorganizing-your-whole-life': 'Open Loops',
  'how-to-have-a-hard-conversation-without-making-it-worse': 'Hard Talk',
  'how-to-keep-a-smart-team-from-making-a-dumb-decision': 'Team Decisions',
  'how-to-know-when-to-trust-your-gut': 'Trust Your Gut',
  'how-to-know-whether-your-metrics-are-lying-to-you': 'Bad Metrics',
  'how-to-make-a-confusing-page-easier-to-use': 'Clear Pages',
  'how-to-make-a-healthy-habit-survive-a-busy-week': 'Busy Habit',
  'how-to-make-a-plan-that-survives-contact-with-reality': 'Reality Plan',
  'how-to-make-project-estimates-less-fictional': 'Real Estimates',
  'how-to-negotiate-salary-without-guessing-your-worth': 'Salary Ask',
  'how-to-prioritize-when-every-request-sounds-urgent': 'Prioritize',
  'how-to-run-user-interviews-that-do-not-lie-to-you': 'Better Research',
  'how-to-tell-whether-to-pivot-or-keep-going': 'Pivot?',
  'how-to-test-a-risky-idea-before-you-build-too-much': 'Risk Test',
  'how-to-turn-a-vague-goal-into-an-actual-strategy': 'Strategy',
  'how-to-turn-messy-feedback-into-a-real-signal': 'Feedback Signal',
  'how-to-validate-an-idea-without-fooling-yourself': 'Idea Validation',
};

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split('\n')) {
    const [rawKey, ...rest] = line.split(':');
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim();
    const value = rest.join(':').trim();
    if (value.startsWith('[')) {
      data[key] = [...value.matchAll(/"([^"]+)"/g)].map((item) => item[1]);
    } else if (value === 'true' || value === 'false') {
      data[key] = value === 'true';
    } else {
      data[key] = value.replace(/^"|"$/g, '');
    }
  }
  return data;
}

function readAnswers() {
  return fs
    .readdirSync(answersDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const id = file.replace(/\.md$/, '');
      const markdown = fs.readFileSync(path.join(answersDir, file), 'utf8');
      const data = parseFrontmatter(markdown);
      return { id, ...data };
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function topicLabel(tags = []) {
  const tag = tags[0] ?? 'insight';
  return tag
    .replaceAll('-', ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function iconFor(tags = []) {
  const normalized = tags.map((tag) => tag.toLowerCase());
  for (const tag of normalized) {
    if (iconByTopic[tag]) return iconByTopic[tag];
  }
  return 'spark';
}

function themeFor(answer, index) {
  return {
    colors: palettes[index % palettes.length],
    icon: iconFor(answer.tags),
    label: labelByAnswer[answer.id] ?? 'Insight',
    topic: topicLabel(answer.tags),
  };
}

function imagePrompt(answer, index) {
  const { colors, icon, label, topic } = themeFor(answer, index);
  const symbol = symbolByIcon[icon] ?? 'one bright sticker emblem';
  return [
    'Create a text-free 16:9 title-card illustration for a premium mobile learning app answer preview.',
    `Answer question: ${answer.question}`,
    `Answer description: ${answer.description}`,
    `Website overlay label, not to be drawn in the image: ${label}`,
    `Topic: ${topic}`,
    `Required visual metaphor: ${symbol}.`,
    `Required palette: solid ${colors.name} background (${colors.bg}), accent ${colors.accent}, highlight ${colors.warm}.`,
    'Style: same large sticker emblem language as the book covers: clean flat 2D, bold geometric shapes, thick crisp outline, slight offset shadow, playful but premium.',
    'Composition: one large emblem on the right half of the horizontal canvas. Leave the left 45% visually calm and mostly solid color because the website will render the title words there.',
    'Background standard: one unbroken solid primary color across the full image. No split panel, no footer band, no dark lower block, no gradients behind the future title.',
    'Simplicity limit: one main object and at most one supporting shape. No collage, no scene, no rooms, no realistic people, no documents, no dashboards, no tiny details.',
    'Hard no-text rule: no letters, no words, no book title, no answer title, no numbers, no punctuation, no fake glyphs, no logos, no labels, no signage, no UI text.',
    'Do not create a physical book cover, 3D book object, product photo, border, screenshot, or anything that looks like typography.',
  ].join(' ');
}

function motif(icon, colors) {
  const { ink, accent, warm, dim } = colors;
  if (icon === 'compass') {
    return `<circle cx="610" cy="260" r="126" fill="${dim}" opacity=".48"/><circle cx="610" cy="260" r="94" fill="none" stroke="${ink}" stroke-width="13" opacity=".72"/><path d="m610 176 34 104-118 64 50-120Z" fill="${accent}"/><circle cx="610" cy="260" r="14" fill="${warm}"/>`;
  }
  if (icon === 'ladder') {
    return `<path d="M510 380 690 132M592 392 772 144" stroke="${ink}" stroke-width="17" opacity=".68"/><path d="M563 304h145M600 252h145M638 199h145" stroke="${accent}" stroke-width="20"/>`;
  }
  if (icon === 'dialogue') {
    return `<path d="M432 174h222c30 0 54 24 54 54v70c0 30-24 54-54 54h-80l-72 58 18-58h-88c-30 0-54-24-54-54v-70c0-30 24-54 54-54Z" fill="${ink}" opacity=".18"/><path d="M506 224h220c26 0 48 22 48 48v60c0 26-22 48-48 48h-52l-54 54 8-54H506c-26 0-48-22-48-48v-60c0-26 22-48 48-48Z" fill="${accent}"/><circle cx="548" cy="303" r="12" fill="${dim}"/><circle cx="616" cy="303" r="12" fill="${dim}"/><circle cx="684" cy="303" r="12" fill="${dim}"/>`;
  }
  if (icon === 'signal') {
    return `<rect x="462" y="316" width="50" height="82" rx="12" fill="${ink}" opacity=".28"/><rect x="542" y="246" width="50" height="152" rx="12" fill="${accent}"/><rect x="622" y="174" width="50" height="224" rx="12" fill="${warm}"/><path d="M442 198c92-64 167-40 250 10" fill="none" stroke="${ink}" stroke-width="15" opacity=".56"/>`;
  }
  if (icon === 'blocks') {
    return `<rect x="458" y="276" width="110" height="110" rx="16" fill="${accent}"/><rect x="588" y="206" width="110" height="180" rx="16" fill="${warm}"/><rect x="520" y="406" width="178" height="54" rx="18" fill="${ink}" opacity=".26"/>`;
  }
  if (icon === 'fork') {
    return `<path d="M410 360c86-76 142-84 210-168" fill="none" stroke="${ink}" stroke-width="20" stroke-linecap="round" opacity=".7"/><path d="M620 192h-82v-82" fill="none" stroke="${accent}" stroke-width="20" stroke-linecap="round"/><path d="M410 360c92 46 154 48 256 96" fill="none" stroke="${warm}" stroke-width="20" stroke-linecap="round"/><circle cx="410" cy="360" r="28" fill="${accent}"/>`;
  }
  if (icon === 'grid') {
    return `<rect x="462" y="166" width="104" height="104" rx="18" fill="${accent}"/><rect x="590" y="166" width="104" height="104" rx="18" fill="${ink}" opacity=".2"/><rect x="462" y="294" width="104" height="104" rx="18" fill="${ink}" opacity=".2"/><rect x="590" y="294" width="104" height="104" rx="18" fill="${warm}"/>`;
  }
  if (icon === 'balance') {
    return `<path d="M600 148v268M486 218h228" stroke="${ink}" stroke-width="16" opacity=".62"/><path d="m486 218-74 132h148Z" fill="${accent}"/><path d="m714 218-74 132h148Z" fill="${warm}"/><rect x="520" y="414" width="160" height="24" rx="12" fill="${ink}" opacity=".35"/>`;
  }
  if (icon === 'loop') {
    return `<path d="M480 320c0-106 134-160 214-88" fill="none" stroke="${ink}" stroke-width="19" opacity=".58"/><path d="M732 258h-86v-86" fill="none" stroke="${accent}" stroke-width="19"/><path d="M730 316c0 106-134 160-214 88" fill="none" stroke="${ink}" stroke-width="19" opacity=".58"/><path d="M478 378h86v86" fill="none" stroke="${warm}" stroke-width="19"/>`;
  }
  if (icon === 'target') {
    return `<circle cx="604" cy="282" r="128" fill="${dim}" opacity=".38"/><circle cx="604" cy="282" r="92" fill="none" stroke="${ink}" stroke-width="16" opacity=".7"/><circle cx="604" cy="282" r="44" fill="${accent}"/><path d="m604 282 122-104" stroke="${warm}" stroke-width="18" stroke-linecap="round"/>`;
  }
  return `<path d="m604 142 34 92 98 4-76 60 26 94-82-54-82 54 26-94-76-60 98-4Z" fill="${accent}"/><circle cx="604" cy="286" r="132" fill="none" stroke="${ink}" stroke-width="13" opacity=".25"/>`;
}

function renderSvgCover(answer, index) {
  const { colors, icon, label, topic } = themeFor(answer, index);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" role="img" aria-label="${escapeXml(answer.question)} visual">
  <rect width="1280" height="720" fill="${colors.bg}"/>
  <rect x="0" y="0" width="1280" height="720" fill="${colors.dim}" opacity=".1"/>
  <rect x="764" y="94" width="344" height="344" rx="54" fill="${colors.ink}" opacity=".12"/>
  <rect x="84" y="536" width="346" height="3" fill="${colors.ink}" opacity=".22"/>
  <path d="M84 168h254" stroke="${colors.ink}" stroke-width="2" opacity=".2"/>
  <text x="84" y="168" fill="${colors.ink}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="800" letter-spacing="7" opacity=".66">${escapeXml(topic.toUpperCase())}</text>
  <text x="84" y="418" fill="${colors.ink}" font-family="Georgia, 'Times New Roman', serif" font-size="${label.length > 13 ? 58 : 72}" font-weight="700" letter-spacing="0" opacity=".98">${escapeXml(label)}</text>
  <text x="86" y="486" fill="${colors.ink}" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="6" opacity=".56">${String(index + 1).padStart(2, '0')}</text>
  ${motif(icon, colors)}
</svg>
`;
}

async function generateGeminiImage(answer, prompt) {
  const apiKey = geminiApiKey();
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY. Set it directly or keep VITE_GOOGLE_AI_API_KEY in the CrowdListen env file.');
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [{ type: 'text', text: prompt }],
      response_format: { type: 'image', mime_type: geminiImageMime },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini image request failed for ${answer.id}: ${response.status} ${await response.text()}`);
  }
  const json = await response.json();
  const encoded = findImageData(json);
  if (!encoded) throw new Error(`No image data returned for ${answer.id}`);
  fs.writeFileSync(path.join(outputDir, `${answer.id}.${geminiImageExtension}`), Buffer.from(encoded, 'base64'));
}

function geminiApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.GOOGLE_AI_API_KEY) return process.env.GOOGLE_AI_API_KEY;
  if (process.env.VITE_GOOGLE_AI_API_KEY) return process.env.VITE_GOOGLE_AI_API_KEY;
  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
  for (const envPath of geminiKeyEnvPaths) {
    const key =
      readEnvValue(envPath, 'GEMINI_API_KEY') ??
      readEnvValue(envPath, 'GOOGLE_AI_API_KEY') ??
      readEnvValue(envPath, 'VITE_GOOGLE_AI_API_KEY') ??
      readEnvValue(envPath, 'GOOGLE_API_KEY');
    if (key) return key;
  }
  return null;
}

function readEnvValue(envPath, key) {
  if (!fs.existsSync(envPath)) return null;
  const line = fs
    .readFileSync(envPath, 'utf8')
    .split('\n')
    .find((value) => value.trim().startsWith(`${key}=`));
  if (!line) return null;
  return line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
}

function findImageData(value) {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.data === 'string' && (value.mime_type?.startsWith?.('image/') || value.mimeType?.startsWith?.('image/'))) {
    return value.data;
  }
  if (value.output_image?.data) return value.output_image.data;
  if (value.outputImage?.data) return value.outputImage.data;
  if (value.inline_data?.data) return value.inline_data.data;
  if (value.inlineData?.data) return value.inlineData.data;
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = findImageData(child);
    if (found) return found;
  }
  return null;
}

const answers = readAnswers()
  .filter((answer) => !selectedIds || selectedIds.has(answer.id))
  .slice(0, limit);

fs.mkdirSync(outputDir, { recursive: true });

const prompts = {};
for (const [index, answer] of answers.entries()) {
  prompts[answer.id] = {
    question: answer.question,
    label: labelByAnswer[answer.id] ?? 'Insight',
    topic: topicLabel(answer.tags),
    providerPrompt: imagePrompt(answer, index),
  };

  if (provider === 'svg') {
    fs.writeFileSync(path.join(outputDir, `${answer.id}.svg`), renderSvgCover(answer, index));
  } else if (provider === 'gemini' || provider === 'nanobanana') {
    await generateGeminiImage(answer, prompts[answer.id].providerPrompt);
  } else if (provider !== 'prompts') {
    throw new Error(`Unknown provider "${provider}". Use svg, prompts, gemini, or nanobanana.`);
  }
}

fs.writeFileSync(path.join(outputDir, 'prompts.json'), `${JSON.stringify(prompts, null, 2)}\n`);
console.log(`Generated ${answers.length} answer cover prompt${answers.length === 1 ? '' : 's'} in ${path.relative(root, outputDir)}`);
if (provider === 'svg') console.log('Generated SVG answer cover assets.');
if (provider === 'gemini' || provider === 'nanobanana') console.log(`Generated Gemini/Nano Banana ${geminiImageExtension.toUpperCase()} answer cover assets.`);
