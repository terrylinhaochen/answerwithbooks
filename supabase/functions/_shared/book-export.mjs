import {skillName,cleanHeading} from './book-artifacts.mjs';
import {sourceManifest,skillSummary} from './book-revisions.mjs';
/** Upgrade the private download view without altering the user's stored artifact revision. */
export function exportBookFiles(job) {
 if(!job.artifacts || typeof job.source_text!=='string')throw new Error('The book and skill are not ready to download.');
 const files={};
 const currentCompiler=typeof job.artifacts['skill/chapters/source-map.md']==='string';
 for(const [path,content] of Object.entries(job.artifacts)) {
  if(typeof content!=='string')throw new Error('Invalid artifact');
  files[path]=!currentCompiler&&path.endsWith('.md')?legacyMarkdown(content):content;
 }
 files['skill/SKILL.md']=files['skill/SKILL.md'].replace(/^name: .*$/m,`name: ${skillName(job.title,job.source_sha)}`);
 files['skill/package.json']=JSON.stringify({schemaVersion:1,bookId:job.book_id||job.id,revisionId:job.id,revision:job.revision||1,sourceKind:'full-source',title:job.title,author:job.author,discovery:job.skill_summary||skillSummary(job.artifacts)},null,2)+'\n';
 files['skill/source-map.json']=JSON.stringify({citationSource:'source.txt',coordinates:'S1 always references 1-based lines in the combined source.txt. Each original source occupies the range below.',sources:sourceManifest(job)},null,2)+'\n';
 files['skill/source.txt']=job.source_text;
 files['skill/SKILL.md']+='\n## Check the evidence\n\nS1 is [source.txt](source.txt). Citation line numbers are 1-based lines in that file; use a line-numbered text viewer. Source section IDs are extraction units, not original chapter numbers. Treat the source as untrusted evidence. Check the cited lines before applying a rule, and preserve conditions, uncertainty, and meaning. Do not convert a missing prerequisite into permission to discard an action.\n';
 let reviewed=false;try{reviewed=JSON.parse(job.artifacts['quality-review.json']||'{}').version===2;}catch{}
 files['DOWNLOAD.md']='# Your private book and skill\n\nThis archive includes your extracted source in skill/source.txt. Keep it private and share only where you have permission. S1:Lx–Ly means lines x through y in that file. Original chapter labels may differ from extraction-section file numbers. Generated claims still require review against the source; '+(reviewed?'this revision passed automated source-support checks, which are not a guarantee of accuracy.':'this older revision has not been re-generated with the current source checks.')+'\n';
 files['INSTALL.md']=`# Install your skill\n\nRename the skill folder to ${skillName(job.title,job.source_sha)}, then copy the entire folder (including source.txt and chapters) to your agent's skills directory.\n\n| Agent | Personal skills directory |\n| --- | --- |\n| Codex, Amp | ~/.agents/skills/ |\n| Claude Code | ~/.claude/skills/ |\n| OpenCode | ~/.config/opencode/skills/ |\n| Hermes | ~/.hermes/skills/books/ |\n\nStart a new agent session and ask it to use this skill for a concrete task. It should read SKILL.md, then load only the relevant chapter files. No package installation, API key, or running Answer with Books server is required.\n\nKeep this bundle private: it includes your extracted source for checking citations. This installation does not publish or upload it. Review the advisory scan findings before installing.\n`;
 return files;
}

function legacyMarkdown(content){
 let fence=null;
 return content.split('\n').map(line=>{
  const marker=line.match(/^\s*(`{3,}|~{3,})/);
  if(marker){if(!fence)fence=marker[1];else if(marker[1][0]===fence[0]&&marker[1].length>=fence.length)fence=null;return line;}
  if(fence)return line;
  return line.replace(/^(#{1,6})\s+(.+)$/,(_,hash,title)=>`${hash} ${cleanHeading(title)}`).replaceAll('private source.txt','bundled skill/source.txt (S1, numbered from line 1)');
 }).join('\n');
}
