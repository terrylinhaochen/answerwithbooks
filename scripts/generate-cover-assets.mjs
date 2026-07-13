import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const booksDir = path.join(root, 'src/content/books');
const outDirArg = process.argv.find((arg) => arg.startsWith('--out-dir='));
const outputDir = path.join(root, outDirArg?.split('=').slice(1).join('=') ?? 'public/covers');
const providerArg = process.argv.find((arg) => arg.startsWith('--provider='));
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const idsArg = process.argv.find((arg) => arg.startsWith('--ids='));
const styleArg = process.argv.find((arg) => arg.startsWith('--style='));
const concurrencyArg = process.argv.find((arg) => arg.startsWith('--concurrency='));
const provider = providerArg?.split('=')[1] ?? process.env.COVER_PROVIDER ?? 'gemini';
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
const selectedIds = idsArg ? new Set(idsArg.split('=').slice(1).join('=').split(',').filter(Boolean)) : null;
const coverStyle = styleArg?.split('=')[1] ?? process.env.COVER_STYLE ?? 'sticker';
const coverConcurrency = Number(concurrencyArg?.split('=')[1] ?? process.env.COVER_CONCURRENCY ?? 2);
const geminiImageMime = process.env.GEMINI_IMAGE_MIME || 'image/jpeg';
const geminiImageExtension = geminiImageMime === 'image/png' ? 'png' : 'jpg';
const geminiKeyEnvPaths = [
  '/Users/terry/Desktop/crowdlisten_files/platform/crowdlisten_deployed/frontend/.env.local',
  '/Users/terry/Desktop/crowdlisten_files/platform/crowdlisten_agent/crowdlisten-agent/.env',
  '/Users/terry/Desktop/crowdlisten_files/.env',
];

const palettes = {
  business: ['#243747', '#e9b45f', '#f8efe2', '#121d27'],
  product: ['#284b44', '#98c7a8', '#f7efe0', '#132922'],
  decisions: ['#56364b', '#d7a84d', '#f9efe3', '#2a1622'],
  technology: ['#2f3c61', '#9fc5d7', '#f5f0e6', '#161d34'],
  productivity: ['#5d4a32', '#d8c28d', '#fbf3e5', '#2c2115'],
  relationships: ['#6b3f36', '#e0a48e', '#fff0e7', '#341b15'],
  health: ['#315344', '#b8d9aa', '#f6f2e6', '#14291f'],
  default: ['#263747', '#e7d7b8', '#fbf4e8', '#102338'],
};

const motifByTag = [
  ['customer research', 'conversation'],
  ['communication', 'conversation'],
  ['strategy', 'map'],
  ['management', 'ladder'],
  ['decision-making', 'decision'],
  ['judgment', 'decision'],
  ['technology', 'network'],
  ['systems', 'network'],
  ['productivity', 'blocks'],
  ['focus', 'blocks'],
  ['habits', 'loop'],
  ['health', 'loop'],
  ['negotiation', 'balance'],
  ['design', 'grid'],
  ['ux', 'grid'],
];

const symbolByBook = {
  'atomic-habits': 'one clean loop arrow wrapping a single seed',
  'crucial-conversations': 'two simple speech stones meeting in the center',
  'deep-work': 'one glowing desk lamp cone cutting through dark space',
  'designing-your-life': 'one compass needle inside a simple path ring',
  'dont-make-me-think': 'one oversized cursor pointing at a clear doorway',
  'four-thousand-weeks': 'one hourglass reduced to two bold triangles',
  'getting-things-done': 'three stacked blocks snapping into a single check shape',
  'good-strategy-bad-strategy': 'one chess knight aimed at a target dot',
  'high-output-management': 'one factory dial with a single rising needle',
  'made-to-stick': 'one bright pin holding a simple idea card',
  'never-split-the-difference': 'one balanced scale with two uneven circles',
  'seeing-like-a-state': 'one map grid interrupted by a living tree root',
  'so-good-they-cant-ignore-you': 'one chisel carving a sharp star from stone',
  'the-checklist-manifesto': 'one clipboard shape with three abstract ticks, no writing',
  'the-effective-executive': 'one calendar square with a chess piece silhouette',
  'the-lean-startup': 'one small rocket made from a triangle and circle',
  'the-mom-test': 'one microphone pointed at a small evidence dot',
  'the-structure-of-scientific-revolutions': 'one orbit ring breaking and reforming around a cube',
  'the-wisdom-of-crowds': 'one large signal formed by many tiny dots',
  'thinking-fast-and-slow': 'two simple paths, one lightning bolt and one slow curve',
  'zero-to-one': 'one thick outlined ring transforming upward into a single angular prism, one continuous emblem showing a leap into a new dimension',
  'obviously-awesome': 'one bright prism aligning three scattered rays into a single focused beam',
  'traction': 'one bold arrow landing in the center of a simple target ring',
  'competing-against-luck': 'one block being pulled cleanly upward into a progress notch',
  'playing-to-win': 'one decisive path passing through five linked choice gates toward a target',
  'the-goal': 'one narrow hourglass bottleneck between two smooth conveyor lines',
  'continuous-discovery-habits': 'one branching opportunity tree with a single illuminated tested path',
  'the-design-of-everyday-things': 'one door handle whose form unmistakably signals pulling',
  'radical-candor': 'one heart fused with a straight forward-pointing arrow',
  'the-fearless-organization': 'one open doorway cut through a protective shield',
  'difficult-conversations': 'two contrasting speech stones connected by one neutral bridge',
  'getting-to-yes': 'two separate paths curving around conflict and meeting at one shared circle',
  'noise': 'three judgment needles aimed at visibly different points on one dial',
  'superforecasting': 'one probability dial with a precisely calibrated needle and target dot',
  'thinking-in-bets': 'one poker chip balancing a decision arrow against an outcome circle, with no numbers or letters',
  'the-scout-mindset': 'one open eye fused with a clear compass needle',
  'thinking-in-systems': 'one reservoir shape connected to itself by a bold feedback loop',
  'accelerate': 'four small streams combining into one fast upward arrow',
  'team-topologies': 'four distinct modular blocks connected through one clean interaction seam',
  'slow-productivity': 'one sturdy tortoise shell formed from a single precise gear',
  'make-it-stick': 'one retrieval hook pulling a bright memory dot from a simple stack',
  'working-identity': 'two different masks connected by a stepping-stone path',
  'the-happiness-trap': 'one tight thought loop opening toward a values star',
  'scarcity': 'one tunnel narrowing a wide field into a sharp beam of attention',
  'the-good-life': 'two interlocking circles joined by one visible repair stitch',
};

const paletteByBook = {
  'atomic-habits': { bg: '#0f8f5f', accent: '#d7ff3f', warm: '#ff5a4f', ink: '#071d17', name: 'emerald green' },
  'crucial-conversations': { bg: '#d8326f', accent: '#fff0d6', warm: '#ff7a1a', ink: '#2a0716', name: 'raspberry pink' },
  'deep-work': { bg: '#082f8f', accent: '#00d9ff', warm: '#ffd447', ink: '#031334', name: 'electric cobalt blue' },
  'designing-your-life': { bg: '#1458e8', accent: '#ff8a1f', warm: '#83ffd2', ink: '#06235f', name: 'clear cobalt blue' },
  'dont-make-me-think': { bg: '#6a24d8', accent: '#b7ff1f', warm: '#ffffff', ink: '#220855', name: 'saturated purple' },
  'four-thousand-weeks': { bg: '#7a1f77', accent: '#ffd447', warm: '#21d6ff', ink: '#2d0a2c', name: 'aubergine violet' },
  'getting-things-done': { bg: '#008c8c', accent: '#ff8a1f', warm: '#ffffff', ink: '#052d2d', name: 'bright teal' },
  'good-strategy-bad-strategy': { bg: '#f23a1f', accent: '#15d0c8', warm: '#fff1cc', ink: '#4d0d03', name: 'vermilion red' },
  'high-output-management': { bg: '#18206f', accent: '#ff8a1f', warm: '#c8ff2d', ink: '#080b2a', name: 'indigo navy' },
  'made-to-stick': { bg: '#ffc21a', accent: '#1647d9', warm: '#111111', ink: '#4a3200', name: 'sunflower yellow' },
  'never-split-the-difference': { bg: '#8f1249', accent: '#00d9ff', warm: '#ffbd2e', ink: '#330719', name: 'black cherry' },
  'seeing-like-a-state': { bg: '#006bff', accent: '#fff4da', warm: '#ff6b1a', ink: '#00265c', name: 'electric blue' },
  'so-good-they-cant-ignore-you': { bg: '#2341ff', accent: '#ff8a1f', warm: '#ffffff', ink: '#071178', name: 'ultramarine' },
  'the-checklist-manifesto': { bg: '#0c7f3a', accent: '#fff0d6', warm: '#ff5f57', ink: '#042412', name: 'surgical green' },
  'the-effective-executive': { bg: '#2f3238', accent: '#ffbd2e', warm: '#00d9ff', ink: '#111317', name: 'graphite charcoal' },
  'the-lean-startup': { bg: '#7c2cff', accent: '#aaff24', warm: '#ff8a1f', ink: '#2a0a68', name: 'vivid violet' },
  'the-mom-test': { bg: '#0096a6', accent: '#ffd51f', warm: '#ff6b3d', ink: '#053940', name: 'bright turquoise' },
  'the-structure-of-scientific-revolutions': { bg: '#3432c7', accent: '#7dffcf', warm: '#ff8a1f', ink: '#12115a', name: 'deep indigo' },
  'the-wisdom-of-crowds': { bg: '#0877d9', accent: '#37f5ff', warm: '#ffbd2e', ink: '#062b4f', name: 'royal blue' },
  'thinking-fast-and-slow': { bg: '#9c114c', accent: '#ffd51f', warm: '#25d6ff', ink: '#35071b', name: 'magenta burgundy' },
  'zero-to-one': { bg: '#f04b32', accent: '#fff4dc', warm: '#171717', ink: '#4b1008', name: 'vivid vermilion' },
  'obviously-awesome': { bg: '#ff4f87', accent: '#ffe44d', warm: '#173bff', ink: '#4b0921', name: 'hot coral pink' },
  'traction': { bg: '#0847c7', accent: '#ffcf29', warm: '#ff5a38', ink: '#031b4c', name: 'signal blue' },
  'competing-against-luck': { bg: '#d84718', accent: '#83ffb5', warm: '#fff1cd', ink: '#4c1404', name: 'burnt orange' },
  'playing-to-win': { bg: '#5a24b8', accent: '#f7ef4f', warm: '#42e8c0', ink: '#200748', name: 'royal violet' },
  'the-goal': { bg: '#0d6b5e', accent: '#ffbf38', warm: '#fff4df', ink: '#042b26', name: 'deep jade' },
  'continuous-discovery-habits': { bg: '#f04b2e', accent: '#7cffd5', warm: '#fff0cb', ink: '#4c1007', name: 'discovery orange' },
  'the-design-of-everyday-things': { bg: '#f2b70a', accent: '#1234a5', warm: '#fff8df', ink: '#4c3600', name: 'industrial yellow' },
  'radical-candor': { bg: '#e52945', accent: '#8bffce', warm: '#fff2dc', ink: '#4b0712', name: 'direct red' },
  'the-fearless-organization': { bg: '#008c78', accent: '#ffdf43', warm: '#ff6a52', ink: '#042e27', name: 'open teal' },
  'difficult-conversations': { bg: '#8238a7', accent: '#ffcb45', warm: '#6effd0', ink: '#2c0c3a', name: 'dialogue purple' },
  'getting-to-yes': { bg: '#1673d1', accent: '#ffcb3c', warm: '#fff3dc', ink: '#06284c', name: 'agreement blue' },
  'noise': { bg: '#3d4259', accent: '#ff5d73', warm: '#4df0dc', ink: '#151824', name: 'slate signal' },
  'superforecasting': { bg: '#1252a4', accent: '#f9e643', warm: '#7bffd2', ink: '#061f43', name: 'forecast blue' },
  'thinking-in-bets': { bg: '#7b1644', accent: '#57e6d2', warm: '#ffd145', ink: '#2d0718', name: 'casino plum' },
  'the-scout-mindset': { bg: '#007b91', accent: '#ffda42', warm: '#ff6849', ink: '#032d35', name: 'scout cyan' },
  'thinking-in-systems': { bg: '#126442', accent: '#f4dc49', warm: '#76dfff', ink: '#05291b', name: 'systems green' },
  'accelerate': { bg: '#ef3c28', accent: '#58f2d0', warm: '#fff0cc', ink: '#4c0c04', name: 'velocity red' },
  'team-topologies': { bg: '#3151c6', accent: '#ffb936', warm: '#78ffd5', ink: '#0d1c52', name: 'modular blue' },
  'slow-productivity': { bg: '#315b50', accent: '#ffcc4a', warm: '#f5f0db', ink: '#122a25', name: 'patient green' },
  'make-it-stick': { bg: '#d42e74', accent: '#ffdb35', warm: '#6dffcf', ink: '#490a27', name: 'memory magenta' },
  'working-identity': { bg: '#3f46a6', accent: '#ff9f43', warm: '#a6ffda', ink: '#151947', name: 'identity indigo' },
  'the-happiness-trap': { bg: '#e15b1a', accent: '#68efcb', warm: '#fff0d0', ink: '#4b1805', name: 'values orange' },
  'scarcity': { bg: '#702f84', accent: '#ffd33d', warm: '#61efd1', ink: '#280d31', name: 'tunnel violet' },
  'the-good-life': { bg: '#bf315e', accent: '#ffd34d', warm: '#79f0d0', ink: '#430b20', name: 'relationship rose' },
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
    } else if (/^\d+$/.test(value)) {
      data[key] = Number(value);
    } else {
      data[key] = value.replace(/^"|"$/g, '');
    }
  }
  return data;
}

function readBooks() {
  return fs
    .readdirSync(booksDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const id = file.replace(/\.md$/, '');
      const markdown = fs.readFileSync(path.join(booksDir, file), 'utf8');
      const data = parseFrontmatter(markdown);
      return {
        id,
        title: data.title,
        author: data.author,
        year: data.year,
        oneLiner: data.oneLiner,
        readIf: data.readIf,
        tags: data.tags ?? [],
        order: data.order ?? 999,
      };
    })
    .sort((a, b) => a.order - b.order);
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function wrapText(text, maxChars, maxLines = 4) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

function coverTheme(book) {
  const tags = book.tags.map((tag) => tag.toLowerCase());
  const paletteKey =
    tags.find((tag) => palettes[tag]) ??
    (tags.some((tag) => ['startups', 'business', 'strategy', 'management'].includes(tag)) ? 'business' : null) ??
    (tags.some((tag) => ['product', 'customer research'].includes(tag)) ? 'product' : null) ??
    (tags.some((tag) => ['decision-making', 'judgment'].includes(tag)) ? 'decisions' : null) ??
    (tags.some((tag) => ['technology', 'systems', 'engineering'].includes(tag)) ? 'technology' : null) ??
    (tags.some((tag) => ['productivity', 'focus', 'habits'].includes(tag)) ? 'productivity' : null) ??
    'default';
  const motif = motifByTag.find(([tag]) => tags.includes(tag))?.[1] ?? 'mark';
  return { colors: palettes[paletteKey], motif };
}

function motifSvg(motif, accent, paper) {
  if (motif === 'conversation') {
    return `
      <path d="M132 330h190c22 0 40 18 40 40v54c0 22-18 40-40 40h-70l-56 50 12-50h-76c-22 0-40-18-40-40v-54c0-22 18-40 40-40Z" fill="${paper}" opacity=".18"/>
      <circle cx="170" cy="398" r="10" fill="${accent}"/><circle cx="226" cy="398" r="10" fill="${accent}"/><circle cx="282" cy="398" r="10" fill="${accent}"/>`;
  }
  if (motif === 'network') {
    return `
      <path d="M132 345 238 260l128 86-54 132-150-8Z" fill="none" stroke="${paper}" stroke-width="8" opacity=".3"/>
      <circle cx="132" cy="345" r="24" fill="${accent}"/><circle cx="238" cy="260" r="22" fill="${paper}" opacity=".78"/>
      <circle cx="366" cy="346" r="24" fill="${accent}"/><circle cx="312" cy="478" r="22" fill="${paper}" opacity=".78"/><circle cx="162" cy="470" r="20" fill="${accent}"/>`;
  }
  if (motif === 'decision') {
    return `
      <path d="M116 340h246" stroke="${paper}" stroke-width="10" opacity=".25"/>
      <path d="M238 340v150" stroke="${paper}" stroke-width="10" opacity=".25"/>
      <path d="m238 490 74-74 74 74-74 74Z" fill="${accent}"/>
      <path d="m102 340 78-78 78 78-78 78Z" fill="${paper}" opacity=".22"/><path d="m302 340 78-78 78 78-78 78Z" fill="${paper}" opacity=".22"/>`;
  }
  if (motif === 'map') {
    return `
      <path d="M116 300c64-46 105-8 156-54 42-38 94-20 134 14" fill="none" stroke="${paper}" stroke-width="10" opacity=".24"/>
      <path d="M126 430c72-70 128-15 198-72 37-30 76-28 112-5" fill="none" stroke="${paper}" stroke-width="10" opacity=".24"/>
      <circle cx="202" cy="375" r="42" fill="${accent}"/><path d="m202 344 16 44-48-16h64l-48 16Z" fill="${paper}" opacity=".78"/>`;
  }
  if (motif === 'ladder') {
    return `
      <path d="M154 520 314 270M234 540 394 290" stroke="${paper}" stroke-width="10" opacity=".3"/>
      <path d="M197 455h122M228 407h122M259 359h122" stroke="${accent}" stroke-width="14"/>`;
  }
  if (motif === 'blocks') {
    return `
      <rect x="116" y="340" width="88" height="88" fill="${accent}"/><rect x="220" y="292" width="88" height="136" fill="${paper}" opacity=".2"/>
      <rect x="324" y="240" width="88" height="188" fill="${accent}" opacity=".82"/><rect x="168" y="448" width="192" height="48" fill="${paper}" opacity=".28"/>`;
  }
  if (motif === 'loop') {
    return `
      <path d="M156 405c0-82 104-126 168-72" fill="none" stroke="${paper}" stroke-width="14" opacity=".28"/>
      <path d="M350 355h-72v-72" fill="none" stroke="${accent}" stroke-width="14"/>
      <path d="M372 405c0 82-104 126-168 72" fill="none" stroke="${paper}" stroke-width="14" opacity=".28"/>
      <path d="M178 455h72v72" fill="none" stroke="${accent}" stroke-width="14"/>`;
  }
  if (motif === 'balance') {
    return `
      <path d="M250 280v232M156 338h188" stroke="${paper}" stroke-width="10" opacity=".3"/>
      <path d="m156 338-56 104h112Zm188 0-56 104h112Z" fill="${accent}"/><rect x="182" y="512" width="136" height="22" fill="${paper}" opacity=".24"/>`;
  }
  if (motif === 'grid') {
    return `
      <rect x="118" y="300" width="110" height="110" fill="${paper}" opacity=".18"/><rect x="248" y="300" width="110" height="110" fill="${accent}"/>
      <rect x="118" y="430" width="110" height="110" fill="${accent}" opacity=".82"/><rect x="248" y="430" width="110" height="110" fill="${paper}" opacity=".18"/>`;
  }
  return `<circle cx="248" cy="410" r="116" fill="${paper}" opacity=".16"/><circle cx="248" cy="410" r="62" fill="${accent}"/>`;
}

function renderSvgCover(book) {
  const [cover, accent, paper, line] = coverTheme(book).colors;
  const motif = coverTheme(book).motif;
  const titleLines = wrapText(book.title, 16, 4);
  const authorLines = wrapText(book.author, 18, 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 512 768" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(book.title)} cover</title>
  <desc id="desc">Generated editorial cover for ${escapeXml(book.title)} by ${escapeXml(book.author)}.</desc>
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop stop-color="${cover}" offset="0"/>
      <stop stop-color="${line}" offset="1"/>
    </linearGradient>
    <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="3"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .08"/></feComponentTransfer></filter>
  </defs>
  <rect width="512" height="768" fill="url(#g)"/>
  <rect x="0" y="0" width="76" height="768" fill="#000" opacity=".18"/>
  <rect x="78" y="0" width="2" height="768" fill="#fff" opacity=".09"/>
  <rect width="512" height="768" filter="url(#paper)" opacity=".55"/>
  <path d="M430-20c-70 110-60 224 22 342 48 68 54 146 18 234" fill="none" stroke="${paper}" stroke-width="24" opacity=".06"/>
  ${motifSvg(motif, accent, paper)}
  <g transform="translate(102 92)">
    ${authorLines.map((lineText, index) => `<text x="0" y="${index * 20}" fill="${paper}" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="5" opacity=".76">${escapeXml(lineText.toUpperCase())}</text>`).join('')}
  </g>
  <g transform="translate(102 150)">
    ${titleLines.map((lineText, index) => `<text x="0" y="${index * 50}" fill="${paper}" font-family="Georgia, 'Times New Roman', serif" font-size="42" font-weight="700">${escapeXml(lineText)}</text>`).join('')}
  </g>
  <rect x="102" y="612" width="196" height="34" fill="${accent}" opacity=".95"/>
  <text x="102" y="696" fill="${paper}" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="6" opacity=".76">${escapeXml(String(book.year))}</text>
</svg>
`;
}

function styleInstruction(book, symbol) {
  const palette = paletteByBook[book.id];
  const paletteText = palette
    ? `solid ${palette.name} background (${palette.bg}), accent ${palette.accent}, highlight ${palette.warm}`
    : 'one distinctive saturated background, one electric accent, one warm highlight';
  if (coverStyle === 'primary') {
    return [
      `Required palette: ${paletteText}.`,
      'Style variation: bold flat poster tile. Use one huge simple geometric symbol or cropped emblem, hard edges, and high contrast.',
      'The background must be one unbroken solid primary color across the entire image. Do not add a darker footer, lower band, separator line, vignette, or separate bottom block.',
      'Make the books visibly different from each other by using the required primary background color strongly. The final set should not look like variations of the same navy/teal cover.',
    ];
  }
  if (coverStyle === 'sticker') {
    return [
      `Required palette: ${paletteText}.`,
      'Style variation: large sticker emblem. Make the symbol feel like one bold app sticker on a flat color field, with a thick clean outline and slight offset shadow. Use a playful, high-contrast Duolingo or Headway-like app illustration energy, but keep it premium.',
      'The emblem should occupy 45-55% of the upper canvas, with generous padding on every side so no sticker edge gets cropped. Avoid tiny details. The result should be instantly recognizable from across the room.',
      'The background must remain one unbroken solid primary color across the entire image, including the bottom 42% where the title plate will sit. Do not add a darker footer, lower band, separator line, vignette, or separate bottom block.',
      'Make the books visibly different from each other by using the required primary background color strongly. The final set should not look like variations of the same navy/teal cover.',
    ];
  }
  if (coverStyle === 'poster') {
    return [
      `Required palette: ${paletteText}.`,
      'Style variation: Swiss poster abstraction. Use one huge geometric symbol, hard edges, asymmetry, and a dramatic diagonal or circular composition. It should feel more like a memorable poster crop than a generic app icon.',
      'Use bold color blocking and one surprising accent shape. Avoid centered sameness across books.',
    ];
  }
  if (coverStyle === 'object') {
    return [
      `Required palette: ${paletteText}.`,
      'Style variation: single surreal object. Make one memorable object that combines the book concept with a physical metaphor, rendered as a clean flat cutout. No scene, no background environment, no extra props.',
      'The object should be weird enough to remember but simple enough to identify at thumbnail size.',
    ];
  }
  return [
    `Required palette: ${paletteText}.`,
    'Style variation: minimal app icon. Use one centered emblem, flat shapes, crisp edges, and generous negative space.',
  ];
}

function imagePrompt(book) {
  const { motif } = coverTheme(book);
  const symbol = symbolByBook[book.id] ?? `one ${motif} emblem`;
  return [
    'Create a text-free vertical icon illustration for a premium mobile learning app book tile.',
    `Concept seed: ${book.oneLiner}`,
    `Reader situation: ${book.readIf}`,
    `Required symbol: ${symbol}.`,
    ...styleInstruction(book, symbol),
    'Memorability standard: the image must read instantly at a tiny thumbnail size. If the idea needs more than one emblem, simplify it.',
    'Style: flat 2D illustration, bold geometric shapes, crisp edges, premium editorial taste, not photorealistic, not painterly, not collage.',
    'Composition standard: one centered emblem fully contained in the upper 56% of the 2:3 vertical canvas, generous negative space, no scene, no background environment, no depth-of-field, no realistic room, no hands.',
    'Simplicity limit: use one main object and at most one supporting shape. Avoid clusters, crowds, many lines, tiny parts, diagrams, dashboards, maps with detail, charts, documents, UI, and decorative clutter.',
    'Background standard: perfectly solid matte color field or a nearly solid field with only extremely subtle paper grain. Keep the bottom 42% calm and unobstructed for the website title overlay. No gradients, no pattern fields, no texture-heavy backgrounds, no horizontal split.',
    'Color standard: very high contrast and memorable. Use the required palette strongly so this book looks different from the others. Avoid beige, gray, washed-out neutrals, muddy gradients, monochrome palettes, and low-contrast pastel art.',
    'Hard no-text rule: no letters, no words, no book title, no author name, no numbers, no punctuation marks, no fake glyphs, no interface icons, no logos, no labels, no signage.',
    'Avoid literal speech bubbles, question marks, documents with writing, screens with UI, pages with text, book mockups, or any surface that could look like typography.',
    'Keep the whole tile visually balanced and padded; the website will show title and author outside the image.',
    'Do not create a physical book cover, 3D book object, product photo, border, page spine, drop shadow, room background, hands, or a book sitting on a surface.',
  ].join(' ');
}

async function generateGeminiImage(book, prompt) {
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
    throw new Error(`Gemini image request failed for ${book.id}: ${response.status} ${await response.text()}`);
  }
  const json = await response.json();
  const encoded = findImageData(json);
  if (!encoded) throw new Error(`No image data returned for ${book.id}`);
  fs.writeFileSync(path.join(outputDir, `${book.id}.${geminiImageExtension}`), Buffer.from(encoded, 'base64'));
}

async function generateOpenAiImage(book, prompt) {
  const apiKey = openAiApiKey();
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY for OpenAI cover generation.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      store: false,
      model: process.env.OPENAI_IMAGE_HOST_MODEL || 'gpt-5.5',
      input: prompt,
      tools: [{
        type: 'image_generation',
        model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5',
        size: '1024x1536',
        quality: process.env.OPENAI_IMAGE_QUALITY || 'high',
        background: 'opaque',
        output_format: 'jpeg',
        output_compression: 92,
      }],
      tool_choice: 'required',
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI image request failed for ${book.id}: ${response.status} ${await response.text()}`);
  }
  const json = await response.json();
  const encoded = json.output?.find((item) => item.type === 'image_generation_call')?.result;
  if (!encoded) throw new Error(`No OpenAI image data returned for ${book.id}`);
  fs.writeFileSync(path.join(outputDir, `${book.id}.jpg`), Buffer.from(encoded, 'base64'));
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

function openAiApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  for (const envPath of geminiKeyEnvPaths) {
    const key = readEnvValue(envPath, 'OPENAI_API_KEY');
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

const books = readBooks()
  .filter((book) => !selectedIds || selectedIds.has(book.id))
  .slice(0, limit);
fs.mkdirSync(outputDir, { recursive: true });

if (!Number.isInteger(coverConcurrency) || coverConcurrency < 1 || coverConcurrency > 6) {
  throw new Error('--concurrency must be an integer from 1 to 6.');
}

const promptsPath = path.join(outputDir, 'prompts.json');
let prompts = {};
if (fs.existsSync(promptsPath)) {
  try {
    prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));
  } catch {
    prompts = {};
  }
}
for (const book of books) {
  prompts[book.id] = {
    title: book.title,
    author: book.author,
    style: coverStyle,
    providerPrompt: imagePrompt(book),
  };
}

await runCoverPool(books, coverConcurrency, async (book) => {
  if (provider === 'svg') {
    fs.writeFileSync(path.join(outputDir, `${book.id}.svg`), renderSvgCover(book));
  } else if (provider === 'gemini' || provider === 'nanobanana') {
    await generateGeminiImage(book, prompts[book.id].providerPrompt);
  } else if (provider === 'openai') {
    await generateOpenAiImage(book, prompts[book.id].providerPrompt);
  } else if (provider !== 'prompts') {
    throw new Error(`Unknown provider "${provider}". Use svg, prompts, gemini, nanobanana, or openai.`);
  }
});

fs.writeFileSync(promptsPath, `${JSON.stringify(prompts, null, 2)}\n`);
console.log(`Generated ${books.length} cover prompt${books.length === 1 ? '' : 's'} in ${path.relative(root, outputDir)}`);
if (provider === 'svg') console.log('Generated SVG cover assets.');
if (provider === 'gemini' || provider === 'nanobanana') console.log(`Generated Gemini/Nano Banana ${geminiImageExtension.toUpperCase()} cover assets.`);
if (provider === 'openai') console.log('Generated OpenAI JPEG cover assets.');

async function runCoverPool(items, size, worker) {
  let index = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      await worker(item);
      console.log(`[cover] ${item.id}`);
    }
  });
  await Promise.all(workers);
}
