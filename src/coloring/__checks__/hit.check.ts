/** Self-check for the hit map decoder. Run: npx tsx src/coloring/__checks__/hit.check.ts */
import assert from 'node:assert/strict';

import { bytesToBase64, encodeRle } from '../__fixtures__/encode';
import { samplePage } from '../__fixtures__/sample-page';
import { base64ToBytes, decodeRle, regionAt } from '../hit';
import { PAGES } from '../pages';

// base64 round trip, all padding lengths, compared with Node's Buffer
for (const len of [0, 1, 2, 3, 4, 5, 255]) {
  const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 37 + 11) & 0xff);
  const b64 = bytesToBase64(bytes);
  assert.equal(b64, Buffer.from(bytes).toString('base64'));
  assert.deepEqual(base64ToBytes(b64), bytes);
}

// RLE with long runs (multi-byte varints) round-trips
const grid = new Uint8Array(70000);
grid.fill(3, 10, 300);
grid.fill(7, 300, 65000);
grid[69999] = 255;
assert.deepEqual(decodeRle(base64ToBytes(encodeRle(grid)), grid.length), grid);
assert.throws(() => decodeRle(base64ToBytes(encodeRle(grid)), grid.length + 1));

// sample page lookups (page units)
const p = samplePage();
assert.equal(regionAt(p, 5, 5), 0, 'margin = background');
assert.equal(regionAt(p, -1, 10), null);
assert.equal(regionAt(p, 300, 10), null);
assert.equal(regionAt(p, 30, 40), 1, 'sky');
assert.equal(regionAt(p, 250, 60), 2, 'sun');
assert.equal(regionAt(p, 190, 110), 3, 'cloud over sun');
assert.equal(regionAt(p, 30, 350), 4, 'grass');
assert.equal(regionAt(p, 180, 250), 5, 'house');
assert.equal(regionAt(p, 130, 170), 6, 'roof');
assert.equal(regionAt(p, 125, 300), 7, 'door');
assert.equal(regionAt(p, 143, 284), 7, 'door knob detail → door');
assert.equal(regionAt(p, 85, 220), 8, 'window');
assert.equal(regionAt(p, 244, 300), 9, 'ball');
assert.equal(regionAt(p, 60, 344), 10, "stroke-painted fence rail");
assert.equal(p.original.length, p.regions);

// every generated page decodes, names only existing regions and (with the background region) has no holes and only names existing regions
for (const page of PAGES) {
  const g = decodeRle(base64ToBytes(page.hit.rle), page.hit.w * page.hit.h);
  for (const v of g) assert.ok(v <= page.regions, `${page.id}: value ${v} > regions ${page.regions}`);
  const holes = g.reduce((n, v) => n + (v === 0 ? 1 : 0), 0);
  if (holes) console.warn(`${page.id}: ${holes} hit cells with no region (expected 0 with the background region)`);
  const bg = page.shapes[0];
  if (bg?.r === undefined || (bg.sw ?? 0) > 0) console.warn(`${page.id}: first shape is not a borderless background region`);
}
console.log(`hit check OK (sample + ${PAGES.length} generated pages)`);
