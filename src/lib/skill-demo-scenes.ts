// Authored examples grounded in our public digests. These are illustrative
// installed-skill runs, not recorded tool calls or generated chat responses.
export const skillDemoScenes = [
 {
  slug:'the-mom-test',tab:'Interview customers',task:'Help me interview customers about my meal-planning app.',
  result:'Ask about what happened. Not what might.',
  steps:['Walk me through dinner last Tuesday.','What did you do when your plans changed?','What have you already tried to make planning easier?'],
  note:'Skip “Would you use my app?” It invites a prediction.',
  methods:['Ask about specific past behavior.','Look for existing workarounds.','Treat compliments as weak evidence.'],
 },
 {
  slug:'deep-work',tab:'Find your focus',task:'Help me finish a proposal without checking Slack every ten minutes.',
  result:'One deliverable. One protected block.',
  steps:['Choose one proposal section to finish.','Block a quiet hour. Close Slack and silence alerts.','Check messages afterward, then plan the next block.'],
  note:'Measure the work you finish, not time spent at your desk.',
  methods:['Give each focus block a concrete output.','Set a time, place, and rule for distractions.','Separate deep work from shallow work.'],
 },
 {
  slug:'atomic-habits',tab:'Build a habit',task:'I keep giving up on reading. Help me make it stick.',
  result:'Make starting easier than skipping.',
  steps:['After your morning coffee, open your book.','Read for two minutes. Continuing is optional.','Leave the book beside tomorrow’s cup.'],
  note:'Make the start repeatable before raising the target.',
  methods:['Attach a new habit to an existing cue.','Shrink the start to two minutes.','Make the environment do some of the work.'],
 },
] as const;
