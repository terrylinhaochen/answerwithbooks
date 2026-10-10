import {imagePrompt,coverImageDefaults} from '../supabase/functions/_shared/book-cover-design.mjs';
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
        model: process.env.OPENAI_IMAGE_MODEL || coverImageDefaults.model,
        size: coverImageDefaults.size,
        quality: process.env.OPENAI_IMAGE_QUALITY || coverImageDefaults.quality,
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
    providerPrompt: imagePrompt(book,{style:coverStyle,motif:coverTheme(book).motif}),
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
