import { bookSkillCommand } from './tool-catalog.mjs';

// Every host installs the same pinned skill and hosted CLI. Node 20+ required.
// This is the public reading skill, separate from the retired research-tool setup.
export const bookSkillSetupPrompt = `Read https://answerwithbooks.com/SKILL.md and install the Answer with Books skill for this agent. Verify that you can list the public books, and tell me when it’s ready.`;
export const sharedSkillInstallCommand = bookSkillCommand;
const sharedNote = 'Installs the skill instructions. On first use, your agent runs the Answer with Books CLI to load the public library. Public books need no account. Run login to connect your guides and subscription.';
export const bookSkillPlatforms = [
  { id: 'codex', name: 'Codex', command: bookSkillCommand.replace(' --api', ''), note: 'Installs the Codex skill and public library. Public books need no account. Run login to connect your guides and subscription.' },
  ...[
    ['claude-code', 'Claude Code'], ['cursor', 'Cursor'], ['github-copilot', 'GitHub Copilot'],
    ['gemini-cli', 'Gemini CLI'], ['opencode', 'OpenCode'], ['openclaw', 'OpenClaw'],
  ].map(([id, name]) => ({ id, name, command: `${sharedSkillInstallCommand} --agent ${id}`, note: sharedNote })),
  { id: 'choose', name: 'Other agent', command: `${sharedSkillInstallCommand} --skill-dir /path/to/your/agent/skills`, note: 'Replace the path with your agent’s skills folder. Installs the same skill and runtime.' },
];
// The shared installer targets the default OpenClaw profile, not custom state directories.
bookSkillPlatforms.find(platform => platform.id === 'openclaw').note = `${sharedNote} Uses the default OpenClaw profile; custom profiles need the skill in their active skills folder.`;
