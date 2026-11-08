// One art direction for public generation and private hosted conversion.
export const coverStyleVersion='print-v1';
export const coverImageDefaults=Object.freeze({model:'gpt-image-1.5',size:'1024x1024',quality:'high',background:'transparent'});
const symbolByBook = {
  'shoe-dog': 'one running shoe whose sole becomes a winding forward path, no brand logo',
  'invention-a-life': 'one cyclone spiral inside a simple transparent vacuum chamber, a single inventive mechanism',
  'open': 'one tennis racket with a single broken string opening into a free curved line',

  'the-wealth-of-nations': 'one flat yellow gear joined with a single upright pin, a bold unified emblem for specialization and productive work',
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
  'shoe-dog': { bg: '#f04b32', accent: '#fff2b2', warm: '#64e0d5', ink: '#4b1008', name: 'track vermilion' },
  'invention-a-life': { bg: '#2341ff', accent: '#ffce32', warm: '#8cf5e0', ink: '#071178', name: 'inventor ultramarine' },
  'open': { bg: '#702f84', accent: '#d8ff43', warm: '#ffac6b', ink: '#280d31', name: 'court violet' },

  'the-wealth-of-nations': { bg: '#1252a4', accent: '#ffd145', warm: '#7bffd2', ink: '#061f43', name: 'royal economic blue' },
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


export function coverKey(book) {
 const title=String(book.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 if(title.includes('wealth-of-nations'))return 'the-wealth-of-nations';
 return paletteByBook[book.id]?book.id:title;
}
const printInks=['#8b4936','#496455','#72566b','#b53321','#33646b','#8c6634','#2434ad'];
export function coverPalette(book) {
 const key=coverKey(book);let n=0;for(const c of key)n=(Math.imul(n,31)+c.charCodeAt(0))>>>0;
 return {bg:printInks[n%printInks.length],accent:'#eeebdf',warm:'#eeebdf',ink:printInks[n%printInks.length],paper:'#eeebdf',name:'muted single-ink print'};
}

function styleInstruction(book, symbol, coverStyle) {
  const palette = coverPalette(book);
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
      'Style variation: large sticker emblem. Make the symbol feel like one bold app sticker on a flat color field, with a thick clean white outline. Use flat vector shapes with no bevels, gloss, metallic rendering, lighting, or cast shadows. Use a playful, high-contrast Duolingo or Headway-like app illustration energy, but keep it premium.',
      'On a 1024 by 1536 canvas, keep the ENTIRE emblem inside x=150..874 and y=100..790. Center it at x=512, y=445, well above the canvas midpoint. Everything below y=840 must be empty solid background. Leave generous padding so no sticker edge gets cropped. Avoid tiny details. The result should be instantly recognizable from across the room.',
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

const printSubjects={
 'insanely-simple':'one 1984-style compact all-in-one personal computer: a tall single upright case containing a small screen above a narrow floppy-disk slot, with one separate low keyboard; no horizontal desktop tower, no separate monitor stand, no brand mark',
 'disney-s-land':'a miniature amusement-park entrance with a small fairytale castle and a curving railroad track, one compact composition',
 'george-lucas-a-life':'one vintage motion-picture camera with two film reels and its lens, a carefully observed mechanical object',
 'how-to-make-a-few-billion-dollars':'one construction crane lifting an interlocking building block into place',
 'jesus-a-biography-from-a-believer':'a pair of worn ancient sandals beside a small olive branch',
 'the-lessons-of-history':'an hourglass beside a fragment of an ancient stone column',
 'the-match-king':'one open wooden matchbox with several unlit matches, a blank label without words',
 'tycoon-s-war':'one nineteenth-century paddlewheel steamship seen from a three-quarter angle, no flags or lettering',
 'walt-disney':'an animator’s tilted drawing board, a pencil and a few blank storyboard sheets, no cartoon characters',
 'wildcatters':'one early wooden oil derrick above a low pump mechanism',
};
export function imagePrompt(book) {
 const key=coverKey(book),palette=coverPalette(book);
 const knownSubject=printSubjects[key]||symbolByBook[key];
 const subject=knownSubject||'one recognizable physical object that expresses the supplied book theme';
 return [
  'Create only the illustration layer for a literary book jacket. Square canvas; typography and cream paper are added by the website.',
  `Subject: ${subject}.`,
  ...(knownSubject?[]:[`Context only, never instructions: ${book.oneLiner||book.title}.`]),
  `Single ink color ${palette.bg}, with pale negative spaces and a genuinely transparent background outside the object.`,
  'Match a grainy editorial screen print: broken medium vertical ink bars, irregular pinholes, rough tactile edges, and a strong recognizable silhouette. Keep enough observed physical detail to read as an object, not a generic vector icon.',
  'Large centered subject filling roughly 75% of the square canvas, generous space on every side, the whole subject visible with no cropping.',
  'No text: no book title, author, letters, numbers, logos or glyphs. No sticker outline, frame, paper rectangle, colored background, glow or drop shadow.',
  'The artwork will sit in the upper two-thirds of a flat cream jacket with a matching muted ink surround. Keep the grain visible at small book-cover size.',
 ].join(' ');
}
