import skill from '../../../../public/tools/awb-tools/SKILL.md?raw';
export const prerender = true;
export function GET() { return new Response(skill, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } }); }
