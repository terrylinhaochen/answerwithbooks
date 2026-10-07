// Commands and retrieved titles verified against the published npm 0.1.4 package.
// The agent replies are authored illustrations, not recorded model responses.
const cli='npx --yes answer-with-books@0.1.4';
export const skillDemoScenes = [
 {
  slug:'atomic-habits',label:'Browse the shelf',task:'Show me which books I can use.',
  operation:'GET /v1/books',pending:'Listing the shelf',returned:'46 books',
  setup:`${cli} serve`,command:'curl http://127.0.0.1:8787/v1/books',
  output:['The Mom Test','Deep Work','Atomic Habits'],
  outputNote:'Three entries from the 46-book public catalog. Requires the optional local API.',
  result:'A few good places to start.',
  picks:[
   {slug:'the-mom-test',title:'The Mom Test',use:'Better customer interviews.'},
   {slug:'deep-work',title:'Deep Work',use:'Space for focused work.'},
   {slug:'atomic-habits',title:'Atomic Habits',use:'Habits you can repeat.'},
  ],
  steps:[],note:'Choose a book, or let your question guide the search.',
 },
 {
  slug:'the-mom-test',label:'Ask the books',task:'Am I validating this idea or collecting compliments?',
  operation:'ask',pending:'Finding relevant sources',returned:'2 books · 2 answers',
  command:`${cli} ask "Am I validating this idea or collecting compliments?" --json`,
  output:['Books: The Mom Test; Thinking, Fast and Slow','Answer: How to validate an idea without fooling yourself','Answer: How to test a risky idea before you build too much'],
  outputNote:'The command returns sources. Your agent uses them to answer.',
  result:'Look for behavior, not approval.',
  steps:['Ask when the problem last happened.','Find out what they already do to solve it.','Choose a concrete commitment that would test demand.'],
  note:'A compliment is a reaction. A commitment is evidence.',
 },
 {
  slug:'deep-work',label:'Make it personal',task:'How can I protect time for deep work?',
  context:'I keep checking Slack instead of finishing my proposal.',
  operation:'ask --top-of-mind',pending:'Finding relevant sources',returned:'2 books',
  command:`${cli} ask "How can I protect time for deep work?" --top-of-mind "I keep checking Slack instead of finishing my proposal." --json`,
  output:['Books: Deep Work; The Effective Executive','No matching published answer. The question is not saved.'],
  outputNote:'Your agent uses your context and the matched books to work out a next step.',
  result:'One deliverable. One protected block.',
  steps:['Choose one proposal section to finish.','Block a quiet hour. Close Slack and silence alerts.','Check messages afterward, then plan the next block.'],
  note:'Measure the work you finish, not time spent at your desk.',
 },
] as const;
