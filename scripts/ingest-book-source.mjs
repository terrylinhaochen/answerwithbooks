import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBookAdapter } from '../src/lib/upstream-book-node.mjs';
import { prepareBookProcessing } from '../src/lib/book-processing.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const arg = name => args.includes(name) ? args[args.indexOf(name) + 1] : args.find(v => v.startsWith(name + '='))?.slice(name.length + 1);
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
  const extracted = runBookAdapter({operation:'extract',path:source});
  const {text,extractor} = extracted;const pages=extracted.upstreamMetadata?.pages??null;
  const result = await prepareBookProcessing({ outputRoot: path.resolve(arg('--output-dir') || path.join(root, '.book-processing')), book, sourceName: source, sourceBytes, text, extractor, pages });
  console.log(JSON.stringify({ job: path.join(result.directory, 'job.json'), instructions: path.join(result.directory, 'PROCESS.md'), source: path.join(result.directory, 'source.txt'), status: result.job.status, outputs: result.job.outputs, next: 'Follow PROCESS.md once; compile the resulting distillation into both the book artifact and its companion skill.' }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
