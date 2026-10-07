import release from './book-cli-release.json';
// One continuous flow: list public books, retrieve evidence, then let the agent apply it.
// Inspired by Paul Graham's How to Do Great Work; the essay is not a retrieved source.
// The final agent reply is an authored application of the retrieved book sources.
const question='How do I choose a career where I can do great work?';
const context='I love writing, software, and teaching. Where should I focus?';
export const skillDemoFlow = {
 slug:'designing-your-life',question,context,
 catalog:{
  command:`npx --yes answer-with-books@${release.version} books --public --json`,
  count:46,
  books:[
   {slug:'designing-your-life',title:'Designing Your Life'},
   {slug:'deep-work',title:'Deep Work'},
   {slug:'zero-to-one',title:'Zero to One'},
  ],
 },
 command:`npx --yes answer-with-books@${release.version} ask "${question}" --top-of-mind "${context}" --json`,
 matchedLabel:'3 books · 1 answer',
 output:[
  'Books: Working Identity; So Good They Can\'t Ignore You; Designing Your Life',
  'Answer: How to decide what to do with your career next',
 ],
 sourceNote:'Test a possible path. Build skill as you go.',
 result:'Build a small piece of the future you want.',
 steps:[
  'Make a tiny tool that teaches something you care about.',
  'Test it with five people. Notice which part you want to improve.',
  'Ask a practitioner for feedback. Choose one skill to deepen next.',
 ],
 note:'A useful first bet teaches you something and leaves you more capable.',
} as const;
