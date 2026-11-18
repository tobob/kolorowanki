#!/usr/bin/env node
/**
 * App icon family, splash mark and favicon, composed from two Pastelki pictures (MIT,
 * https://pastelki.marchew.work): a butterfly that is half coloured (left wings in their Pastelki
 * colours, right wings still white paper with a few crayon strokes) and the purple crayon doing it.
 *
 *   node tools/brand/brand.mjs           # render from the pinned SVGs in tools/brand/art/
 *   node tools/brand/brand.mjs --fetch   # refresh the pinned SVGs from the Pastelki API first
 *
 * Writes tools/brand/out/*.svg (sources) and assets/images/*.png. Needs @resvg/resvg-js (devDependency);
 * ImageMagick (`magick`) is used, when present, to flatten the iOS icon to opaque RGB.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const artDir = path.join(here, 'art');
const outDir = path.join(here, 'out');
const assets = path.join(root, 'assets/images');
fs.mkdirSync(outDir, { recursive: true });

const API = 'https://pastelki.marchew.work';
const ART = { butterfly: 'butterfly', crayon: 'crayon' };

const CREAM = '#FFF8EE';
const PEACH = '#FCE3D9';
const OUTLINE = '#4B4453';
const WING = '#B490D7'; // the butterfly's own lower-wing colour, used for the crayon strokes

async function fetchArt() {
  const lib = await (await fetch(`${API}/api/library`)).json();
  for (const slug of Object.values(ART)) {
    const item = lib.items.find((i) => i.slug === slug);
    if (!item) throw new Error(`Pastelki has no "${slug}"`);
    const svg = await (await fetch(API + item.svg_url)).text();
    fs.writeFileSync(path.join(artDir, `${slug}.svg`), svg);
    console.log(`fetched ${slug} v${item.version}`);
  }
}

const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

/** Replace exactly one occurrence, so a changed upstream drawing fails loudly instead of silently. */
function swap(src, from, to) {
  const n = src.split(from).length - 1;
  if (n !== 1) throw new Error(`expected 1 match for ${from.slice(0, 60)}…, got ${n}`);
  return src.replace(from, to);
}

function butterfly({ mono = false } = {}) {
  let s = inner(fs.readFileSync(path.join(artDir, 'butterfly.svg'), 'utf8'));
  const rightUpper = /(<g id="pk-arm-r"><path d="[^"]+" fill=")#[0-9A-F]{6}/;
  const rightLower = /(<g id="pk-arm-r-2"><path d="([^"]+)" fill=")#[0-9A-F]{6}/;
  const lowerPath = s.match(rightLower)?.[2];
  if (!lowerPath || !rightUpper.test(s)) throw new Error('butterfly drawing changed: wing groups not found');
  // Right wings: still white paper.
  s = s.replace(rightUpper, '$1#FFFFFF').replace(rightLower, '$1#FFFFFF');
  // The pale spot on the right upper wing is part of the colouring too.
  s = swap(s, '<circle cx="76" cy="34" r="6" fill="#CDB5E4" />', '');
  // A few soft crayon strokes on the right lower wing, clipped to it and drawn under its outline.
  const strokes =
    `<clipPath id="wing"><path d="${lowerPath}"/></clipPath>` +
    `<g clip-path="url(#wing)" stroke="${WING}" stroke-width="6.5" stroke-linecap="round" fill="none">` +
    '<path d="M52 64 L60 57"/><path d="M52 72 L66 59"/><path d="M53 80 L72 62"/><path d="M57 86 L71 77"/></g>' +
    `<path d="${lowerPath}" fill="none" stroke="${OUTLINE}" stroke-width="4" stroke-linejoin="round"/>`;
  s = s.replace(/(<g id="pk-arm-r-2">[\s\S]*?<\/g>)/, `$1${strokes}`);
  if (mono) {
    // Themed (monochrome) icon: a line drawing, like an uncoloured page.
    // Body, head, antennae tips and pupils stay solid; every coloured or white area becomes empty.
    s = s
      .replace(/fill="#3A3A44"/g, 'fill="#000"')
      .replace(/fill="#(?!000")[0-9A-F]{3,6}"/g, 'fill="none"')
      .replace(/stroke="#[0-9A-F]{6}"/g, 'stroke="#000"');
  }
  return s;
}

function crayon({ mono = false } = {}) {
  let s = inner(fs.readFileSync(path.join(artDir, 'crayon.svg'), 'utf8'));
  if (mono) s = s.replace(/(fill|stroke)="#[0-9A-F]{6}"/g, '$1="#000"');
  // Pastelki draws it pointing up-right; turn it so the tip points up-left, into the wing.
  return `<g transform="rotate(-90 50 50)">${s}</g>`;
}

/** The mark in a 100×100 box: butterfly upper-left of centre, crayon tip touching the white wing. */
function mark(opts) {
  return (
    `<g transform="translate(9 7) scale(0.74)">${butterfly(opts)}</g>` +
    `<g transform="translate(58 62) scale(0.33)">${crayon(opts)}</g>`
  );
}

/** Wrap `body` (in 100-unit space) into a square SVG of `px`, optionally scaled about the centre. */
function svg(px, body, { bg, scale = 1, disc } = {}) {
  const off = 50 - 50 * scale;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 100 100">` +
    (bg ? `<rect width="100" height="100" fill="${bg}"/>` : '') +
    (disc ? `<circle cx="50" cy="50" r="${disc.r}" fill="${disc.color}"/>` : '') +
    `<g transform="translate(${off} ${off}) scale(${scale})">${body}</g></svg>`
  );
}

function write(name, px, source, { flatten } = {}) {
  fs.writeFileSync(path.join(outDir, `${name}.svg`), source);
  const file = path.join(assets, `${name}.png`);
  fs.writeFileSync(file, new Resvg(source, { fitTo: { mode: 'width', value: px } }).render().asPng());
  if (flatten) {
    try {
      execFileSync('magick', [file, '-background', flatten, '-alpha', 'remove', '-alpha', 'off', `PNG24:${file}`]);
    } catch {
      console.warn(`magick not found: ${name}.png keeps an (opaque) alpha channel`);
    }
  }
  console.log(`wrote assets/images/${name}.png (${px}px)`);
}

if (process.argv.includes('--fetch')) await fetchArt();

// iOS / store icon: full bleed and opaque (the system applies its own mask).
write('icon', 1024, svg(1024, mark(), { bg: CREAM, disc: { r: 41, color: PEACH }, scale: 0.98 }), { flatten: CREAM });
// Android adaptive icon: plain cream + peach disc behind; the mark inside the 66/108 safe circle.
write('android-icon-background', 512, svg(512, '', { bg: CREAM, disc: { r: 34, color: PEACH } }), { flatten: CREAM });
write('android-icon-foreground', 512, svg(512, mark(), { scale: 0.62 }));
write('android-icon-monochrome', 512, svg(512, mark({ mono: true }), { scale: 0.62 }));
// Splash: the mark resting on a soft peach disc, transparent around it; app.json centres it on cream at 240 pt.
write('splash-icon', 1024, svg(1024, mark(), { disc: { r: 48, color: PEACH }, scale: 0.9 }));
write('favicon', 48, svg(48, mark(), { bg: CREAM, scale: 1.08 }));
// README icon.
fs.mkdirSync(path.join(root, 'docs/images'), { recursive: true });
fs.copyFileSync(path.join(assets, 'icon.png'), path.join(root, 'docs/images/icon.png'));
