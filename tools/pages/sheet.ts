/** Contact sheets: each page as outlines + in its original colours, with id and region count. */
import { writeFileSync } from 'node:fs';

import { PAGE_H, PAGE_W, type Page } from '../../src/coloring/types';
import { pageBody, renderPng } from './render';

/** Distinct pastel per region index (debug view of the segmentation). */
function debugColour(r: number): string {
  const h = (r * 137.508) % 360;
  const sat = 0.55 + (r % 3) * 0.12;
  const l = 0.72 + (r % 4) * 0.05;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - sat * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * mode 'review' (default): each page twice — outlines, then original colours (+ palette dots).
 * mode 'regions': each page once, every region in its own random pastel, to check the segmentation.
 */
export function contactSheet(pages: Page[], file: string, opts: { cols?: number; tile?: number; mode?: 'review' | 'regions' | 'outlines' } = {}) {
  const views = opts.mode === 'regions' ? ['regions'] : opts.mode === 'outlines' ? ['outline'] : ['outline', 'original'];
  const cols = opts.cols ?? 6; // tiles per row (each page = 2 tiles)
  const tw = opts.tile ?? 300;
  const sc = tw / PAGE_W;
  const th = PAGE_H * sc;
  const gap = 14;
  const label = 22;
  const tiles = pages.length * views.length;
  const rows = Math.ceil(tiles / cols);
  const W = cols * (tw + gap) + gap;
  const H = rows * (th + gap + label) + gap;
  let body = '';
  pages.forEach((p, i) => {
    views.forEach((view, vi) => {
      const coloured = view !== 'outline';
      const t = i * views.length + vi;
      const x = gap + (t % cols) * (tw + gap);
      const y = gap + Math.floor(t / cols) * (th + gap + label);
      body +=
        `<g transform="translate(${x} ${y + label}) scale(${sc})"><rect width="${PAGE_W}" height="${PAGE_H}" fill="#fff"/>` +
        `<g clip-path="url(#page)">${pageBody(p.shapes, (r) => (view === 'regions' ? debugColour(r) : coloured ? p.original[r] : '#FFFFFF'))}</g>` +
        `<rect width="${PAGE_W}" height="${PAGE_H}" fill="none" stroke="#bbb" stroke-width="2"/></g>`;
      if (vi === 0)
        body += `<text x="${x}" y="${y + 16}" font-size="15" font-family="Helvetica" fill="#333">${p.id} · ${p.regions} regions · ${p.title.en.replace(/&/g, '&amp;')}</text>`;
      if (view === 'original')
        body += p.palette.map((c, k) => `<circle cx="${x + 10 + k * 22}" cy="${y + 10}" r="9" fill="${c}" stroke="#4B4453" stroke-width="1.5"/>`).join('');
    });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><clipPath id="page"><rect width="${PAGE_W}" height="${PAGE_H}"/></clipPath></defs><rect width="${W}" height="${H}" fill="#EEE"/>${body}</svg>`;
  writeFileSync(file, renderPng(svg, W));
}
