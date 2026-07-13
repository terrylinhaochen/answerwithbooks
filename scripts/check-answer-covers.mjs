import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const answersDir = path.join(root, 'src/content/answers');
const coversDir = path.join(root, 'public/answer-covers');
const idsArg = process.argv.find((arg) => arg.startsWith('--ids='));
const selectedIds = idsArg
  ? new Set(idsArg.split('=').slice(1).join('=').split(',').filter(Boolean))
  : null;
const promptPath = path.join(coversDir, 'prompts.json');
const prompts = fs.existsSync(promptPath) ? JSON.parse(fs.readFileSync(promptPath, 'utf8')) : {};
const answerIds = fs.readdirSync(answersDir)
  .filter((file) => file.endsWith('.md'))
  .map((file) => file.replace(/\.md$/, ''))
  .filter((id) => !selectedIds || selectedIds.has(id));
const failures = [];
const warnings = [];

for (const id of answerIds) {
  const asset = ['jpg', 'jpeg', 'png']
    .map((extension) => path.join(coversDir, `${id}.${extension}`))
    .find((candidate) => fs.existsSync(candidate));
  if (!asset) {
    failures.push(`${id}: missing raster cover`);
    continue;
  }
  if (!prompts[id]?.providerPrompt) failures.push(`${id}: missing recorded provider prompt`);

  const image = sharp(asset);
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const ratio = height ? width / height : 0;
  if (width < 1200 || height < 675) failures.push(`${id}: cover is only ${width}x${height}`);
  if (Math.abs(ratio - 16 / 9) > 0.02) failures.push(`${id}: aspect ratio is ${ratio.toFixed(3)}, expected 16:9`);

  if (width && height) {
    const leftWidth = Math.floor(width * 0.45);
    const stats = await sharp(asset)
      .extract({ left: 0, top: 0, width: leftWidth, height })
      .resize({ width: 96, height: 54, fit: 'fill' })
      .stats();
    const averageDeviation = stats.channels.slice(0, 3).reduce((sum, channel) => sum + channel.stdev, 0) / 3;
    if (averageDeviation > 82) {
      failures.push(`${id}: left title area is too busy (${averageDeviation.toFixed(1)} average deviation)`);
    } else if (averageDeviation > 38) {
      warnings.push(`${id}: visually inspect the left title area (${averageDeviation.toFixed(1)} average deviation)`);
    }
  }
}

if (failures.length) {
  console.error(`Answer cover QA failed (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

if (warnings.length) console.warn(`Answer cover QA warnings (${warnings.length}):\n- ${warnings.join('\n- ')}`);
console.log(`Answer cover QA passed for ${answerIds.length} cover${answerIds.length === 1 ? '' : 's'}.`);
