/**
 * Pastelki library access: fetch the public catalogue + SVGs, cache them, and safety-check every SVG.
 *
 * - Online: GET ${SOURCE}/api/library → tools/pages/cache/library.json, SVGs → tools/pages/cache/svg/<slug>.svg
 * - Offline / reproducible: tools/pages/svgs/<slug>.svg + tools/pages/svgs/library.json (committed copy of the
 *   items the pages actually use). The build prefers the committed copy unless `--refresh` is passed.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { LANGS, type Localized } from '../../src/coloring/types';

export const SOURCE = process.env.PASTELKI_URL ?? 'https://pastelki.marchew.work';
const HERE = __dirname;
const CACHE = join(HERE, 'cache');
const CACHE_SVG = join(CACHE, 'svg');
export const SVGS = join(HERE, 'svgs');
const COMMITTED_LIB = join(SVGS, 'library.json');

export type LibItem = {
  slug: string;
  names: Localized;
  category: string;
  svg_url: string;
  version: number;
  color_hex: string;
};

/** Reasons an SVG must not be used (empty = fine). Same spirit as Pasujki's tools/pastelki/sync.ts. */
export function svgProblems(svg: string): string[] {
  const p: string[] = [];
  if (!/^<svg\b[^>]*viewBox="0 0 100 100"/.test(svg.trim())) p.push('not a viewBox="0 0 100 100" drawing');
  if (/<script|<foreignObject|<image\b|<use\b|<style|\son[a-z]+\s*=|javascript:|href\s*=\s*"(?!#)|url\((?!#)/i.test(svg)) p.push('active or external content');
  if (/<!ENTITY|<!DOCTYPE/i.test(svg)) p.push('doctype/entities');
  if (svg.length > 200_000) p.push('too large');
  return p;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

export class Library {
  items = new Map<string, LibItem>();
  private svgs = new Map<string, string>();
  used = new Set<string>();
  constructor(private refresh: boolean) {}

  async load() {
    let raw: { items: LibItem[] } | undefined;
    if (!this.refresh && existsSync(COMMITTED_LIB)) raw = JSON.parse(readFileSync(COMMITTED_LIB, 'utf8'));
    if (!raw) {
      mkdirSync(CACHE_SVG, { recursive: true });
      try {
        const txt = await fetchText(`${SOURCE}/api/library`);
        writeFileSync(join(CACHE, 'library.json'), txt);
        raw = JSON.parse(txt);
      } catch (e) {
        if (!existsSync(join(CACHE, 'library.json'))) throw e;
        console.warn(`library: offline (${(e as Error).message}), using cache`);
        raw = JSON.parse(readFileSync(join(CACHE, 'library.json'), 'utf8'));
      }
    }
    // items not in the committed copy yet (a new page): take them from the download cache
    const cached = join(CACHE, 'library.json');
    if (raw && !this.refresh && existsSync(cached)) {
      const have = new Set(raw.items.map((i) => i.slug));
      raw = { items: [...raw.items, ...(JSON.parse(readFileSync(cached, 'utf8')).items as LibItem[]).filter((i) => !have.has(i.slug))] };
    }
    for (const i of raw!.items) {
      this.items.set(i.slug, {
        slug: i.slug,
        names: i.names,
        category: i.category,
        svg_url: i.svg_url,
        version: i.version,
        color_hex: i.color_hex,
      });
    }
  }

  item(slug: string): LibItem {
    const it = this.items.get(slug);
    if (!it) throw new Error(`Pastelki item "${slug}" not in library (new item? run npm run build-pages -- --refresh)`);
    for (const l of LANGS) if (!it.names?.[l]?.trim()) throw new Error(`${slug}: missing name for ${l}`);
    return it;
  }

  async svg(slug: string): Promise<string> {
    const hit = this.svgs.get(slug);
    if (hit) return hit;
    const it = this.item(slug);
    const committed = join(SVGS, `${slug}.svg`);
    const cached = join(CACHE_SVG, `${slug}-v${it.version}.svg`);
    let svg: string;
    if (!this.refresh && existsSync(committed)) svg = readFileSync(committed, 'utf8');
    else if (existsSync(cached)) svg = readFileSync(cached, 'utf8');
    else {
      mkdirSync(CACHE_SVG, { recursive: true });
      svg = (await fetchText(SOURCE + it.svg_url)).trim();
      writeFileSync(cached, svg);
    }
    const bad = svgProblems(svg);
    if (bad.length) throw new Error(`${slug} v${it.version}: unsafe SVG — ${bad.join(', ')}`);
    this.svgs.set(slug, svg);
    this.used.add(slug);
    return svg;
  }

  /** Write the committed offline copy: exactly the SVGs used + their catalogue entries. */
  saveCommitted() {
    mkdirSync(SVGS, { recursive: true });
    const used = [...this.used].sort();
    for (const s of used) writeFileSync(join(SVGS, `${s}.svg`), this.svgs.get(s)! + '\n');
    const items = used.map((s) => this.items.get(s)!);
    writeFileSync(
      COMMITTED_LIB,
      JSON.stringify({ source: SOURCE, note: 'Pastelki pictures, MIT © Pastelki. Subset used by Kolorowanki.', items }, null, 1) + '\n',
    );
  }
}
