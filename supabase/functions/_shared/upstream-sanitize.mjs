// Generated from book-to-skill sanitize.py; MIT, Copyright (c) 2025 virgiliojr94.
// Source SHA-256: b2e251402d1a5f95cf6f7c9cc293b4c977612d9b0a96b77a234741d626404627
const ranges=[[173, 173], [847, 847], [1564, 1564], [4447, 4448], [6158, 6158], [8203, 8207], [8234, 8238], [8288, 8292], [8294, 8303], [12644, 12644], [65024, 65039], [65279, 65279], [65440, 65440], [65529, 65531], [119155, 119162], [917504, 917631], [917760, 917999]];
export const sanitizeSource=text=>Array.from(text).filter(c=>!ranges.some(([a,b])=>{const n=c.codePointAt(0);return n>=a&&n<=b;})).join('');
