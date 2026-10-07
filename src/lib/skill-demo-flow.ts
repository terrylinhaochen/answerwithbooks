// Retrieval verified against the published answer-with-books@0.1.4 package.
// The final agent reply is an authored illustration, not recorded model output.
const question='How should I interview customers to validate my meal-planning app?';
const context='I want five customer interviews before building the app.';
export const skillDemoFlow = {
 slug:'the-mom-test',question,context,
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
