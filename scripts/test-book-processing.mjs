import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { prepareBookProcessing, compileBookProcessing } from '../src/lib/book-processing.mjs';
const text = '# Small Decision Manual\nBy AWB test authors\n\n## Chapter 1: Reversible choices\nUse a small trial when the choice can be reversed.\nSet a stopping point and measure the result before expanding.\nThis method does not apply when a trial can cause irreversible harm.\n\n## Chapter 2: Evidence review\nSeparate observed outcomes from interpretations.\nReview contradictory evidence before choosing the next trial.\nA small sample cannot establish how common an outcome is.\n';
async function fixture(t) {
  const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'awb-processing-test-'));
  t.after(() => rm(outputRoot, { recursive: true, force: true }));
  const input = { outputRoot, book: { id: 'small-decision-manual', title: 'Small Decision Manual', author: 'AWB test authors' }, sourceName: 'manual.md', sourceBytes: Buffer.from(text), text, extractor: 'direct_text_copy' };
  const { directory, job } = await prepareBookProcessing(input);
  const data = { schemaVersion: 1, jobId: job.id, sourceSha256: job.source.sha256, textSha256: job.source.textSha256,
    book: { year: null, oneLiner: 'Learn from bounded trials and inspect the evidence.', readIf: 'You need to choose a reversible next step.', tags: ['decision-making'], thesis: 'A reversible trial can reduce uncertainty when its result is examined with care.' }, coverage: { scope: 'full-source', gaps: [] },
    chapters: [
      { id: 'ch01', title: 'Reversible choices', summary: 'Use a bounded experiment for a decision that can safely be undone.', sourceRefs: [{ startLine: 4, endLine: 7 }], ideas: [{ name: 'Bounded trial', decisionRule: 'When reversal is safe, run a bounded trial because its result reduces uncertainty.', explanation: 'Limit exposure while gathering decision evidence.', whenToUse: 'The next action is reversible.', steps: ['Set a trial boundary and a measure of success.', 'Review the result before expanding.'], limits: 'Do not apply to irreversible harm.', sourceRefs: [{ startLine: 5, endLine: 7 }] }] },
      { id: 'ch02', title: 'Evidence review', summary: 'Distinguish observations from explanations and keep conflicting data visible.', sourceRefs: [{ startLine: 9, endLine: 12 }], ideas: [{ name: 'Observation check', explanation: 'Interpretations can outrun what the sample establishes.', whenToUse: 'A trial result will inform another decision.', steps: ['List observed and contradictory outcomes.'], limits: 'Small samples do not establish prevalence.', sourceRefs: [{ startLine: 10, endLine: 12 }] }] },
    ], glossary: [{ term: 'Bounded trial', definition: 'A reversible test with a stopping point.', chapterIds: ['ch01'] }],
  };
  return { outputRoot, input, directory, job, data };
}
const compile = f => compileBookProcessing({ directory: f.directory, distillation: f.data });
test('one extraction produces linked book and skill artifacts with matching source references', async t => {
  const f = await fixture(t); const result = await compile(f);
  assert.equal(result.manifest.status, 'drafts_ready');
  assert.deepEqual(result.manifest.validation.upstream.errors, []);
  assert.match(await readFile(path.join(result.directory, 'skill/cheatsheet.md'), 'utf8'), /Decision rule: When reversal is safe/);
  assert.equal(result.manifest.outputs.book.status, 'needs_review');
  assert.equal(result.manifest.outputs.skill.status, 'needs_review');
  assert.equal(result.manifest.validation.behavioralEvaluation, 'not_performed');
  const book = await readFile(path.join(result.directory, 'book.md'), 'utf8');
  const skill = await readFile(path.join(result.directory, 'skill/SKILL.md'), 'utf8');
  const chapter = await readFile(path.join(result.directory, 'skill/chapters/ch01.md'), 'utf8');
  assert.match(book, /\[Open the companion skill\]\(skill\/SKILL.md\)/);
  for (const output of [book, skill]) assert.ok(output.includes(f.job.source.sha256));
  for (const output of [book, chapter]) assert.ok(output.includes('S1:L5–L7'));
  assert.ok(book.includes('Bounded trial') && chapter.includes('Bounded trial'));
  for (const file of result.manifest.files) assert.ok((await readFile(path.join(result.directory, file.path))).length);
  assert.equal((await readdir(result.directory)).includes('source.txt'), false);
  assert.equal(JSON.parse(await readFile(path.join(result.directory, 'skill/provenance.json'), 'utf8')).jobId, f.job.id);
});
test('rejects source revision mismatch before producing either output', async t => {
  const f = await fixture(t); f.data.textSha256 = 'wrong-revision';
  await assert.rejects(compile(f), /different job or source/);
  await assert.rejects(readFile(path.join(f.directory, 'artifacts/book.md')), { code: 'ENOENT' });
});
test('rejects changed extracted text and out-of-range citations', async t => {
  const f = await fixture(t); f.data.chapters[0].ideas[0].sourceRefs[0].endLine = 999;
  await assert.rejects(compile(f), /outside the extracted source/);
  await writeFile(path.join(f.directory, 'source.txt'), text + 'Changed revision.');
  await assert.rejects(compile(f), /changed after intake/);
});
test('chapter paths and glossary references cannot escape the generated package', async t => {
  const f = await fixture(t); f.data.chapters[0].id = '../../outside';
  await assert.rejects(compile(f), /Chapter ids/);
  f.data.chapters[0].id = 'ch01'; f.data.glossary[0].chapterIds = ['missing'];
  await assert.rejects(compile(f), /unknown chapter/);
});
test('retry reuses the same job and preserves reviewed or edited outputs', async t => {
  const f = await fixture(t); assert.equal((await prepareBookProcessing(f.input)).directory, f.directory);
  const first = await compile(f); const second = await compile(f); assert.deepEqual(first.manifest, second.manifest);
  await writeFile(path.join(first.directory, 'book.md'), 'Human edited book artifact');
  await assert.rejects(compile(f), /were edited/);
  assert.equal(await readFile(path.join(first.directory, 'book.md'), 'utf8'), 'Human edited book artifact');
});
test('missing boundaries and undeclared coverage gaps cannot produce a ready package', async t => {
  const f = await fixture(t); const limits = f.data.chapters[0].ideas[0].limits; f.data.chapters[0].ideas[0].limits = '';
  await assert.rejects(compile(f), /limits must contain/); f.data.chapters[0].ideas[0].limits = limits;
  f.data.coverage = { scope: 'partial', gaps: [] }; await assert.rejects(compile(f), /must describe its gaps/);
  f.data.coverage.gaps = ['Only selected chapters were supplied.']; const result = await compile(f);
  for (const name of ['book.md', 'skill/SKILL.md']) assert.match(await readFile(path.join(result.directory, name), 'utf8'), /Only selected chapters were supplied/);
});
test('rejects empty sources and unsafe book ids', async t => {
  const f = await fixture(t);
  await assert.rejects(prepareBookProcessing({ ...f.input, text: ' ' }), /Extracted source/);
  await assert.rejects(prepareBookProcessing({ ...f.input, book: { ...f.input.book, id: '../escape' } }), /lowercase slug/);
});
test('CLI intake and compilation handle paths with spaces without a provider', async t => {
  const f = await fixture(t); const source = path.join(f.outputRoot, 'source with spaces.md'); await writeFile(source, text);
  const intake = spawnSync(process.execPath, ['scripts/ingest-book-source.mjs', '--candidate', f.job.book.id, '--source', source, '--title', f.job.book.title, '--author', f.job.book.author, '--output-dir', f.outputRoot], { encoding: 'utf8' });
  assert.equal(intake.status, 0, intake.stderr); const packet = JSON.parse(intake.stdout); assert.deepEqual(packet.outputs, ['book', 'skill']);
  const analysis = path.join(f.outputRoot, 'reviewed distillation.json'); await writeFile(analysis, JSON.stringify(f.data));
  const compiled = spawnSync(process.execPath, ['scripts/compile-book-artifacts.mjs', '--job', path.dirname(packet.job), '--distillation', analysis], { encoding: 'utf8' });
  assert.equal(compiled.status, 0, compiled.stderr); assert.equal(JSON.parse(compiled.stdout).manifest.visibility, 'private');
});
