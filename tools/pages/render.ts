/** SVG markup for pages (previews, contact sheets) and resvg rendering helpers. */
import { Resvg } from '@resvg/resvg-js';

import { OUTLINE, PAGE_H, PAGE_W, PAPER, type Page, type Shape } from '../../src/coloring/types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** The page drawn exactly like the app should: painter's order, each shape fill then its own stroke. */
export function pageBody(shapes: Shape[], colourOf: (r: number) => string): string {
  return shapes
    .map((s) => {
      if (s.r !== undefined && s.paint === 'stroke')
        return `<path d="${esc(s.d)}" fill="none" stroke="${colourOf(s.r)}" stroke-width="${s.sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
      const fill = s.r !== undefined ? colourOf(s.r) : (s.fill ?? 'none');
      const st = s.sw ? ` stroke="${OUTLINE}" stroke-width="${s.sw}" stroke-linecap="round" stroke-linejoin="round"` : '';
      return `<path d="${esc(s.d)}" fill="${fill}"${st}/>`;
    })
    .join('');
}

export function pageSvg(page: Pick<Page, 'shapes' | 'original'>, coloured: boolean): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE_W} ${PAGE_H}" width="${PAGE_W}" height="${PAGE_H}">` +
    `<rect width="${PAGE_W}" height="${PAGE_H}" fill="${PAPER}"/>` +
    pageBody(page.shapes, (r) => (coloured ? page.original[r] : PAPER)) +
    `</svg>`
  );
}

export function renderPng(svg: string, width: number): Buffer {
  return new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true, defaultFontFamily: 'Helvetica' } })
    .render()
    .asPng();
}

/** Raw RGBA pixels of an SVG at its own size, no antialiasing. */
export function renderRaw(svg: string): { w: number; h: number; px: Uint8Array } {
  const img = new Resvg(svg, { shapeRendering: 0, textRendering: 0, imageRendering: 1, font: { loadSystemFonts: false } }).render();
  return { w: img.width, h: img.height, px: new Uint8Array(img.pixels) };
}
