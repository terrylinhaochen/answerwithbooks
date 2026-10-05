import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prepareBookProcessing } from '../src/lib/book-processing.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const arg = name => args.includes(name) ? args[args.indexOf(name) + 1] : args.find(v => v.startsWith(name + '='))?.slice(name.length + 1);
let temp;
try {
  const id = arg('--candidate') || arg('--book-id');
  const sourcePath = arg('--source');
  if (!id || !sourcePath) throw new Error('Usage: npm run engine:ingest -- --candidate book-id --source /path/to/source.pdf [--title "Title" --author "Author" --output-dir /private/output]');
  const source = path.resolve(sourcePath);
  const sourceBytes = await readFile(source);
  let candidates = [];
  try { candidates = JSON.parse(await readFile(path.join(root, 'content-engine/book-supply-candidates.json'), 'utf8')).candidates ?? []; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const candidate = candidates.find(item => item.id === id) ?? {};
  const book = { id, title: arg('--title') || candidate.title || id, author: arg('--author') || candidate.author || 'Unknown author' };
  let text, extractor, pages = null;
  if (/\.(txt|md)$/i.test(source)) { text = sourceBytes.toString('utf8'); extractor = 'direct_text_copy'; }
  else if (/\.pdf$/i.test(source)) {
    temp = await mkdtemp(path.join(os.tmpdir(), 'awb-extract-'));
    const output = path.join(temp, 'source.txt');
    const bundled = '/Users/terry/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
    const extraction = spawnSync(existsSync(bundled) ? bundled : 'python3', [path.join(root, 'scripts/extract-pdf-text.py'), source, output], { encoding: 'utf8' });
    if (extraction.error || extraction.status !== 0) throw new Error(extraction.stderr || extraction.error?.message || 'PDF extraction failed.');
    pages = JSON.parse(extraction.stdout.trim()).pages ?? null;
    text = await readFile(output, 'utf8'); extractor = 'pypdf';
  } else throw new Error('Use .pdf, .txt, or .md. Full-book extraction requires a source document, not a cover image.');
  const result = await prepareBookProcessing({ outputRoot: path.resolve(arg('--output-dir') || path.join(root, '.book-processing')), book, sourceName: source, sourceBytes, text, extractor, pages });
  console.log(JSON.stringify({ job: path.join(result.directory, 'job.json'), instructions: path.join(result.directory, 'PROCESS.md'), source: path.join(result.directory, 'source.txt'), status: result.job.status, outputs: result.job.outputs, next: 'Follow PROCESS.md once; compile the resulting distillation into both the book artifact and its companion skill.' }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (temp) await rm(temp, { recursive: true, force: true }); }
