import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { compileBookProcessing } from '../src/lib/book-processing.mjs';
const args = process.argv.slice(2);
const arg = name => args.includes(name) ? args[args.indexOf(name) + 1] : args.find(v => v.startsWith(name + '='))?.slice(name.length + 1);
try {
  if (!arg('--job') || !arg('--distillation')) throw new Error('Usage: npm run engine:compile -- --job /path/to/job --distillation /path/to/distillation.json');
  const result = await compileBookProcessing({ directory: path.resolve(arg('--job')), distillation: JSON.parse(await readFile(arg('--distillation'), 'utf8')) });
  console.log(JSON.stringify({ ...result, note: 'Both artifacts were generated privately. Content review, behavioral testing, installation, and publication are separate.' }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
