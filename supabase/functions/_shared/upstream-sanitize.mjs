// Generated from book-to-skill sanitize.py; MIT, Copyright (c) 2025 virgiliojr94.
// Source SHA-256: cd3aa1f68f37e4c6ecba3413ca10097eebe4d9a05daf50194bc669510e7ceb0d
const ranges=[[173, 173], [847, 847], [1564, 1564], [4447, 4448], [6068, 6069], [6155, 6159], [8203, 8207], [8234, 8238], [8288, 8292], [8294, 8303], [12644, 12644], [65024, 65039], [65279, 65279], [65440, 65440], [65529, 65531], [113824, 113827], [119155, 119162], [917504, 917631], [917760, 917999]];
export const sanitizeSource=text=>Array.from(text).filter(c=>!ranges.some(([a,b])=>{const n=c.codePointAt(0);return n>=a&&n<=b;})).join('');
