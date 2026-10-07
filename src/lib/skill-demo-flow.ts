// Retrieval verified against the published answer-with-books@0.1.4 package.
// The final agent reply is an authored illustration, not recorded model output.
const question='How should I interview customers to validate my meal-planning app?';
const context='Five interviews before I build.';
export const skillDemoFlow = {
 slug:'the-mom-test',question,context,
 catalog:{
  setup:'npx --yes answer-with-books@0.1.4 serve',
  command:'curl http://127.0.0.1:8787/v1/books',
  count:46,
  books:[
   {slug:'the-mom-test',title:'The Mom Test'},
   {slug:'deep-work',title:'Deep Work'},
   {slug:'atomic-habits',title:'Atomic Habits'},
  ],
 },
 command:`npx --yes answer-with-books@0.1.4 ask "${question}" --top-of-mind "${context}" --json`,
 output:['Book: The Mom Test','No matching published answer. The question is not saved.'],
 result:'Ask about their last dinner. Start here:',
 steps:[
  'Walk me through how you planned dinner last week.',
  'When did that plan fall apart, and what did you do?',
  'What have you already tried to make it easier?',
 ],
 note:'Listen for real workarounds. Skip “Would you use my app?”',
} as const;
