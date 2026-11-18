/**
 * Pull newer approved pictures from Pastelki (the shared source of truth) and rebuild the colouring pages.
 *
 *   npm run sync-art          # refresh every used item to its newest Pastelki version, rebuild, check
 *   npm run sync-art -- --dry # only list items whose Pastelki version is newer than the committed copy
 *
 * The committed copy (tools/pages/svgs/library.json) records the version of every item in use, so the run
 * is idempotent: when nothing changed upstream the generated pages stay byte-identical. The first line of
 * output is a one-line summary (used as the commit message body by the GitHub Action and `studio sync-art`).
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SOURCE } from './library';

type Item = { slug: string; version: number };
const LIB = join(__dirname, 'svgs', 'library.json');
const ROOT = join(__dirname, '../..');

async function main() {
  const mine: Item[] = JSON.parse(readFileSync(LIB, 'utf8')).items;
  const res = await fetch(`${SOURCE}/api/library`);
  if (!res.ok) throw new Error(`${SOURCE}/api/library: HTTP ${res.status}`);
  const theirs = new Map((((await res.json()) as { items: Item[] }).items).map((i) => [i.slug, i.version]));
  const newer = mine.filter((i) => (theirs.get(i.slug) ?? 0) > i.version);
  const gone = mine.filter((i) => !theirs.has(i.slug));
  const summary = newer.length
    ? `Pastelki: ${newer.length} newer picture(s): ${newer.map((i) => `${i.slug} v${i.version}→v${theirs.get(i.slug)}`).join(', ')}`
    : 'Pastelki: everything up to date';
  console.log(summary + (gone.length ? ` · no longer published (kept): ${gone.map((i) => i.slug).join(', ')}` : ''));
  if (!newer.length || process.argv.includes('--dry')) return;
  execSync('npm run --silent build-pages -- --refresh', { cwd: ROOT, stdio: 'inherit' });
  execSync('npm run --silent check-pages', { cwd: ROOT, stdio: 'inherit' });
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
