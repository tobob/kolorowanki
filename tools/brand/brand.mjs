#!/usr/bin/env node
/**
 * App icon family, splash mark and favicon, composed from Pastelki pictures (MIT,
 * https://pastelki.club). Nothing is redrawn: the subject is one of the app's own pages
 * (tools/pages/svgs, synced from Pastelki), shown half coloured (its Pastelki colours on one side,
 * white paper with a few crayon strokes on the other), with the Pastelki crayon doing the colouring
 * and a soft paint splash behind. The only non-Pastelki shapes are the splash blob and the hatch.
 *
 *   node tools/brand/brand.mjs                # render the chosen design into assets/images
 *   node tools/brand/brand.mjs --candidates   # also render every candidate's preview sheet
 *   node tools/brand/brand.mjs --fetch        # refresh the pinned crayon from the Pastelki API first
 *
 * Writes tools/brand/out/*.svg (sources), assets/images/*.png and docs/images/icon.png;
 * candidates go to tools/brand/out/candidates/<name>/ (icon + dark icon at 1024 px, and a sheet with
 * every variant at 60 px on a light and a dark home screen next to the splash).
 * Needs @resvg/resvg-js (devDependency) and ImageMagick (`magick`).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const pagesDir = path.join(root, 'tools/pages/svgs'); // the app's pages, synced from Pastelki
const artDir = path.join(here, 'art'); // pinned Pastelki pictures that are not pages (the crayon)
const outDir = path.join(here, 'out');
const assets = path.join(root, 'assets/images');
fs.mkdirSync(outDir, { recursive: true });

const API = 'https://pastelki.club';

/** The design that ships. See CANDIDATES below for the others. */
const CHOSEN = 'kitten';

// Shell colours (src/constants/ui.ts TONE): cream paper, the four level-card pastels, charcoal ink.
const CREAM = '#FFF8EE';
const LEVEL = ['#FCE3D9', '#DDEFDB', '#DCEAF7', '#ECE1F6'];
const INK = '#4B4453';
const PAPER = '#FFFFFF';
const NIGHT = '#2E2A35'; // iOS dark icon background: a deep plum-charcoal, the ink's own hue
/** Colours that are line work in Pastelki pictures: they stay as they are on the paper side. */
const DARK = new Set(['#4B4453', '#3A3A44', '#585860']);
const BLUSH = '#F4A3B4';

// ---------------------------------------------------------------------------------------------
// colour helpers

const hex = (c) => {
  c = c.toUpperCase();
  return c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
};
const rgb = (c) => [1, 3, 5].map((i) => parseInt(hex(c).slice(i, i + 2), 16));
const toHex = (v) =>
  `#${v.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const mix = (a, b, t) => toHex(rgb(a).map((x, i) => x + (rgb(b)[i] - x) * t));
const shade = (c, k) => toHex(rgb(c).map((x) => x * k));

/** Recolour every fill/stroke hex in an SVG fragment through `fn(hex) → hex | 'none'`. */
const recolour = (s, fn) => s.replace(/(fill|stroke)="(#[0-9A-Fa-f]{3,6})"/g, (_, a, c) => `${a}="${fn(hex(c))}"`);

// ---------------------------------------------------------------------------------------------
// sources

async function fetchArt() {
  const lib = await (await fetch(`${API}/api/library`)).json();
  const item = lib.items.find((i) => i.slug === 'crayon');
  if (!item) throw new Error('Pastelki has no "crayon"');
  fs.writeFileSync(path.join(artDir, 'crayon.svg'), await (await fetch(API + item.svg_url)).text());
  console.log(`fetched crayon v${item.version}`);
}

const inner = (svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const page = (slug) => inner(fs.readFileSync(path.join(pagesDir, `${slug}.svg`), 'utf8'));

/** White-paper version: every coloured area becomes paper, line work stays. */
const paperOf = (s) => recolour(s, (c) => (DARK.has(c) || c === '#FFFFFF' ? c : c === BLUSH ? 'none' : PAPER));
/** Mask of the paper areas (white = may be hatched; line work black). */
const paperMask = (s) => recolour(s, (c) => (DARK.has(c) ? '#000000' : c === BLUSH ? 'none' : '#FFFFFF'));
/** Line work only, black on white (monochrome and tinted sources). */
const lines = (s) => recolour(s, (c) => (DARK.has(c) ? '#000000' : c === BLUSH ? 'none' : '#FFFFFF'));

/**
 * The Pastelki crayon (drawn pointing up-right, tip at 90,10) recoloured to `base` with the style
 * guide's tint recipe and turned to point up-left, so its tip lands at (10,10) of its own box.
 */
function crayon(base) {
  const map = {
    '#9B6BC9': base,
    '#CDB5E4': mix(base, '#FFFFFF', 0.55),
    '#745097': shade(base, 0.76),
    '#C8AEE1': mix(base, '#FFFFFF', 0.5),
  };
  const s = recolour(inner(fs.readFileSync(path.join(artDir, 'crayon.svg'), 'utf8')), (c) => map[c] ?? c);
  return `<g transform="rotate(-90 50 50)">${s}</g>`;
}

/** A soft, round paint splash: one blob with a wavy edge plus three small drops. */
function splash([cx, cy, r], color, drops = color) {
  const at = (a, d) => [(cx + Math.cos(a) * r * d).toFixed(1), (cy + Math.sin(a) * r * d).toFixed(1)];
  const bumps = Array.from({ length: 9 }, (_, i) => {
    const [x, y] = at((i / 9) * Math.PI * 2 + 0.3, 0.8);
    return `<circle cx="${x}" cy="${y}" r="${(r * (i % 2 ? 0.34 : 0.28)).toFixed(1)}"/>`;
  }).join('');
  const drop = (a, d, k) => {
    const [x, y] = at(a, d);
    return `<circle cx="${x}" cy="${y}" r="${(r * k).toFixed(1)}" fill="${drops}"/>`;
  };
  return (
    `<g fill="${color}"><circle cx="${cx}" cy="${cy}" r="${(r * 0.86).toFixed(1)}"/>${bumps}</g>` +
    drop(3.75, 1.2, 0.1) + drop(5.45, 1.22, 0.07) + drop(2.25, 1.18, 0.08)
  );
}

// ---------------------------------------------------------------------------------------------
// candidates

/**
 * Each candidate, in a 100×100 box:
 *   subject    page slug (tools/pages/svgs); `colour` recolours the coloured part (default: as in Pastelki)
 *   keepPaper  the uncoloured side keeps the picture's own (already white) fills
 *   split      polygon, in the picture's own 0..100 space, of the COLOURED part; the rest is paper
 *   ink        crayon colour; `hatch` its strokes (picture space), shown only on paper areas
 *   at         [x, y, scale] of the picture; `pen` crayon scale and where its tip lands (final space)
 *   splash     [cx, cy, r], blob colour and drop colour; `disc` optional white disc (Pasujki-like)
 */
const CANDIDATES = {
  apple: {
    note: 'Half-coloured red apple, red crayon, peach splash with a blue drop',
    subject: 'apple',
    split: '0,0 100,0 100,12 12,100 0,100',
    ink: '#E5534B',
    hatch: ['M38 78 L74 42', 'M50 76 L70 56'],
    at: [6, 4, 0.82],
    pen: { s: 0.36, tip: [63, 50] },
    splash: { c: [50, 52, 40], color: LEVEL[0], drops: LEVEL[2] },
  },
  edyta: {
    note: 'Edyta the sheep, her wool half coloured pink, pink crayon, lilac splash',
    subject: 'sheep',
    colour: (c) => (c === '#FAF7F0' ? '#F7C3D3' : c === '#D6D7DB' ? '#FBDDE6' : c),
    keepPaper: true,
    split: '0,0 47,0 47,100 0,100',
    ink: '#F29BB8',
    hatch: ['M66 70 L80 56', 'M66 82 L86 62', 'M74 86 L90 70'],
    at: [6, 6, 0.8],
    pen: { s: 0.34, tip: [66, 64] },
    splash: { c: [50, 52, 41], color: LEVEL[3], drops: LEVEL[1] },
  },
  kitten: {
    note: 'Half-coloured orange kitten on a white Pasujki-style disc, orange crayon',
    subject: 'kitten',
    split: '0,0 50,0 50,100 0,100',
    ink: '#F28C38',
    hatch: ['M50 70 L62 60', 'M52 90 L66 76'],
    at: [13, 9, 0.72],
    pen: { s: 0.34, tip: [57, 52] },
    disc: { r: 42, color: PAPER },
    splash: { c: [50, 50, 48], color: LEVEL[0], drops: LEVEL[0] },
  },
  butterfly: {
    note: 'The previous butterfly idea re-composed from the synced page: bigger, lilac splash',
    subject: 'butterfly',
    split: '0,0 50,0 50,100 0,100',
    ink: '#B490D7',
    hatch: ['M54 66 L62 59', 'M54 74 L68 61', 'M56 82 L73 65'],
    at: [6, 6, 0.8],
    pen: { s: 0.34, tip: [56, 62] },
    splash: { c: [50, 50, 41], color: LEVEL[3], drops: LEVEL[0] },
  },
};

let uid = 0;
/** The mark (picture + crayon) in 100-unit space; `mono` gives black line work on white. */
function mark(c, { mono = false } = {}) {
  const id = `k${uid++}`;
  const src = page(c.subject);
  let coloured = c.colour ? recolour(src, c.colour) : src;
  let paper = c.keepPaper ? src : paperOf(src);
  let pen = crayon(c.ink);
  let ink = c.ink;
  if (mono) [coloured, paper, pen, ink] = [lines(coloured), lines(paper), lines(pen), '#000000'];
  const [tx, ty, s] = c.at;
  const pic =
    `<clipPath id="${id}c"><polygon points="${c.split}"/></clipPath>` +
    // Hatch only where the paper side is white: paper areas minus line work minus the coloured part.
    `<mask id="${id}m" maskUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200">` +
    `${paperMask(src)}<polygon points="${c.split}" fill="#000000"/></mask>` +
    paper +
    `<g clip-path="url(#${id}c)">${coloured}</g>` +
    `<g mask="url(#${id}m)" stroke="${ink}" stroke-width="6.5" stroke-linecap="round" fill="none">` +
    `${c.hatch.map((d) => `<path d="${d}"/>`).join('')}</g>`;
  const { s: ps, tip } = c.pen;
  return (
    `<g transform="translate(${tx} ${ty}) scale(${s})">${pic}</g>` +
    `<g transform="translate(${tip[0] - ps * 10} ${tip[1] - ps * 10}) scale(${ps})">${pen}</g>`
  );
}

/** Background layers (splash, optional disc) in 100-unit space; `discScale` shrinks the disc about the centre. */
function backdrop(c, { night = false, discScale = 1 } = {}) {
  const tone = (x) => (night ? mix(x, NIGHT, 0.84) : x);
  const disc = c.disc
    ? `<circle cx="50" cy="50" r="${c.disc.r * discScale}" fill="${night ? mix(PAPER, NIGHT, 0.8) : c.disc.color}" ` +
      `stroke="${night ? 'none' : INK}" stroke-width="${2.2 * discScale}"/>`
    : '';
  return splash(c.splash.c, tone(c.splash.color), tone(c.splash.drops)) + disc;
}

/** Wrap `body` (100-unit space) into a square SVG of `px`, optionally scaled about the centre. */
function svg(px, body, { bg, scale = 1 } = {}) {
  const off = 50 - 50 * scale;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 100 100">` +
    (bg ? `<rect width="100" height="100" fill="${bg}"/>` : '') +
    `<g transform="translate(${off} ${off}) scale(${scale})">${body}</g></svg>`
  );
}

const magick = (...args) => execFileSync('magick', args, { stdio: ['ignore', 'ignore', 'inherit'] });

function render(file, px, source, { flatten, svgOut } = {}) {
  if (svgOut) fs.writeFileSync(svgOut, source);
  fs.writeFileSync(file, new Resvg(source, { fitTo: { mode: 'width', value: px } }).render().asPng());
  if (flatten) magick(file, '-background', flatten, '-alpha', 'remove', '-alpha', 'off', `PNG24:${file}`);
}

/** Mark scale on the Android adaptive layers (keeps it inside the 66/108 safe circle). */
const ANDROID = 0.64;

/** The icon family as SVG sources. */
const family = (c) => ({
  // iOS / store icon: full bleed and opaque (the system applies its own mask).
  icon: [1024, svg(1024, backdrop(c) + mark(c), { bg: CREAM }), CREAM],
  // iOS dark appearance: the same picture on a deep plum night, the splash dimmed.
  'ios-icon-dark': [1024, svg(1024, backdrop(c, { night: true }) + mark(c), { bg: NIGHT }), NIGHT],
  // iOS tinted appearance: greyscale on black, the system adds the tint (converted to grey below).
  'ios-icon-tinted': [1024, svg(1024, backdrop(c, { night: true }) + mark(c), { bg: '#000000' }), '#000000'],
  // Android adaptive icon: cream + splash (+ the disc, at the mark's scale) as the background layer;
  // the mark inside the 66/108 safe circle as the foreground.
  'android-icon-background': [512, svg(512, backdrop(c, { discScale: ANDROID }), { bg: CREAM }), CREAM],
  'android-icon-foreground': [512, svg(512, mark(c), { scale: ANDROID })],
  'android-icon-monochrome': [512, svg(512, mark(c, { mono: true }), { bg: '#FFFFFF', scale: ANDROID })],
  // Splash: the mark on its soft splash, transparent around it; app.json centres it on cream.
  'splash-icon': [1024, svg(1024, backdrop(c) + mark(c), { scale: 0.92 })],
  favicon: [48, svg(48, backdrop(c) + mark(c), { bg: CREAM, scale: 1.06 }), CREAM],
});

function writeFamily(c, dir, svgDir) {
  const out = (n) => path.join(dir, `${n}.png`);
  for (const [name, [px, source, flatten]] of Object.entries(family(c))) {
    render(out(name), px, source, { flatten, svgOut: svgDir && path.join(svgDir, `${name}.svg`) });
  }
  magick(out('ios-icon-tinted'), '-colorspace', 'gray', `PNG24:${out('ios-icon-tinted')}`);
  // Monochrome: Android tints by alpha, so black line work on white becomes ink with that darkness as alpha.
  const mono = out('android-icon-monochrome');
  magick('-size', '512x512', 'xc:black', '(', mono, '-background', 'white', '-alpha', 'remove', '-alpha', 'off', '-colorspace', 'gray', '-negate', ')', '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', `PNG32:${mono}`);
}

/** Preview sheet: every variant at 60 px on a light and a dark home screen, next to the splash. */
function sheet(dir) {
  const f = (n) => path.join(dir, n);
  const crop = (src, out, draw) =>
    magick(src, '-resize', '60x60', '(', '-size', '60x60', 'xc:none', '-fill', 'white', '-draw', draw, ')', '-compose', 'DstIn', '-composite', out);
  const squircle = 'roundrectangle 0,0 59,59 14,14';
  crop(f('icon.png'), f('_a.png'), squircle);
  crop(f('ios-icon-dark.png'), f('_b.png'), squircle);
  crop(f('ios-icon-tinted.png'), f('_c.png'), squircle);
  magick(f('android-icon-background.png'), f('android-icon-foreground.png'), '-composite', f('_android.png'));
  crop(f('_android.png'), f('_d.png'), 'circle 30,30 30,0');
  magick(f('android-icon-monochrome.png'), '-background', '#D9E3F0', '-alpha', 'remove', f('_mono.png'));
  crop(f('_mono.png'), f('_e.png'), 'circle 30,30 30,0');
  const tiles = ['_a', '_b', '_c', '_d', '_e'].map((t) => f(`${t}.png`));
  const row = (bg, out) =>
    magick('-size', `${tiles.length * 84 + 24}x108`, `xc:${bg}`, ...tiles.flatMap((t, i) => [t, '-geometry', `+${24 + i * 84}+24`, '-composite']), out);
  row('#EEEAE4', f('_light.png'));
  row('#1C1C1E', f('_dark.png'));
  magick(f('splash-icon.png'), '-resize', '200x200', '-background', CREAM, '-gravity', 'center', '-extent', '216x216', f('_splash.png'));
  magick(f('_light.png'), f('_dark.png'), '-append', f('_rows.png'));
  magick(f('_rows.png'), f('_splash.png'), '+append', f('preview-60px.png'));
  for (const n of fs.readdirSync(dir)) if (n.startsWith('_')) fs.rmSync(f(n));
}

if (process.argv.includes('--fetch')) await fetchArt();

if (process.argv.includes('--candidates')) {
  for (const [name, c] of Object.entries(CANDIDATES)) {
    const dir = path.join(outDir, 'candidates', name);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    writeFamily(c, dir);
    sheet(dir);
    for (const n of fs.readdirSync(dir)) {
      if (!['icon.png', 'ios-icon-dark.png', 'preview-60px.png'].includes(n)) fs.rmSync(path.join(dir, n));
    }
    console.log(`candidate ${name}: ${c.note}`);
  }
}

writeFamily(CANDIDATES[CHOSEN], assets, outDir);
console.log(`wrote assets/images/* from candidate "${CHOSEN}"`);
// README and site icon.
fs.mkdirSync(path.join(root, 'docs/images'), { recursive: true });
fs.copyFileSync(path.join(assets, 'icon.png'), path.join(root, 'docs/images/icon.png'));
