import release from './book-cli-release.json';
// Illustrated reading, not a live catalog response. The excerpt is transcribed
// from the user-supplied Shoe Dog PDF, printed page 8 (PDF page marker 8).
const question='How do I find something worthwhile doing?';
const context='I love writing, software, and teaching. Where should I focus?';
export const skillDemoFlow = {
 slug:'shoe-dog',question,context,
 catalog:{
  command:`npx --yes ${release.package || `answer-with-books@${release.version}`} books --json`,
  count:3,
  books:[
   {slug:'shoe-dog',title:'Shoe Dog',author:'Phil Knight',color:'#f04b32'},
   {slug:'invention-a-life',title:'Invention: A Life',author:'James Dyson',color:'#2341ff'},
   {slug:'open',title:'Open',author:'Andre Agassi',color:'#702f84'},
  ],
 },
 command:`npx --yes ${release.package || `answer-with-books@${release.version}`} ask "${question}" --json`,
 matchedLabel:'3 books · 1 reading',
 output:[
  'Books: Shoe Dog; Invention: A Life; Open',
  'Reading: How do I find something worthwhile doing?',
 ],
 sourceNote:'A pull toward something. A problem to stay with. An ambition to question.',
 result:'Start with the feeling you want to return to.',
 scene:'01 · Shoe Dog',
 contextBefore:'Before co-founding Nike, Phil Knight was a 24-year-old runner back at his parents’ home. He knew he would never be a great athlete. On a morning run in 1962, he began to imagine another way to stay close to the sport.',
 excerpt:'What if there were a way, without being an athlete, to feel what athletes feel? To play all the time, instead of working? Or else to enjoy work so much that it becomes essentially the same thing.',
 citation:'Phil Knight · Shoe Dog · Dawn · p. 8',
 connection:'Knight starts with an experience he wants more of, before he has a company to build. For your own question, the clue may be what draws you back—not yet a job title.',
 note:'Next, Dyson gives that attraction a different shape: a particular problem he cannot leave alone. Agassi complicates the story with an ambition chosen for him.',
} as const;
