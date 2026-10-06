import skill from '../../../public/tools/awb-tools/SKILL.md?raw';
import { packageToolSkill } from '../../lib/tool-skill-package.mjs';

export const prerender = true;
export function GET() {
  return new Response(new Uint8Array(packageToolSkill(skill)), {
    headers: { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="awb-tools.zip"' },
  });
}
