import { bookSkillCommand } from './tool-catalog.mjs';

// v1.5 supports Node 20; v1.6+ requires Node >=22.20. The AWB runtime needs Node 20+.
// This is the public reading skill, separate from the retired research-tool setup.
export const sharedSkillInstallCommand = 'npx --yes skills@1.5.0 add Crowdlisten/Crowdlisten_books --skill answer-with-books --global';
const sharedNote = 'Installs the skill instructions. On first use, your agent runs the Answer with Books CLI to load the public library. No account or API key needed.';
export const bookSkillPlatforms = [
  { id: 'codex', name: 'Codex', command: bookSkillCommand, note: 'Includes the Codex skill, public library, and optional local API. No account or API key needed.', next: 'Then, start a new Codex chat' },
  ...[
    ['claude-code', 'Claude Code'], ['cursor', 'Cursor'], ['github-copilot', 'GitHub Copilot'],
    ['gemini-cli', 'Gemini CLI'], ['opencode', 'OpenCode'], ['openclaw', 'OpenClaw'],
  ].map(([id, name]) => ({ id, name, command: `${sharedSkillInstallCommand} --agent ${id}`, note: sharedNote, next: `Then, start a new ${name} chat` })),
  { id: 'choose', name: 'Other / multiple agents', command: sharedSkillInstallCommand, note: 'Choose one or more agents in the terminal. The same skill uses the Answer with Books CLI to load the public library on first use.', next: 'Then, start a new chat in your selected agent' },
];
// The shared installer targets the default OpenClaw profile, not custom state directories.
bookSkillPlatforms.find(platform => platform.id === 'openclaw').note = `${sharedNote} Uses the default OpenClaw profile; custom profiles need the skill in their active skills folder.`;
