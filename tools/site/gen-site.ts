/**
 * Generates the static support site (repo tobob/kolorowanki-site, GitHub Pages): one page per language and topic.
 *   English (default, linked from the store): /  /privacy/  /terms/
 *   Other languages:                          /<lang>/  /<lang>/privacy/  /<lang>/terms/
 * The privacy pages use the same texts as the app: English is the full policy from docs/PRIVACY.md,
 * every other language is the policy shown in the app's grown-ups area (src/i18n/locales/<lang>.ts).
 * Run: npm run site -- <out-dir>   (e.g. ../kolorowanki-site)
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { type Lang } from '../../src/coloring/types';
import { CONTACT, DEVELOPER, PASTELKI } from '../../src/constants/contact';
import cs from '../../src/i18n/locales/cs';
import de from '../../src/i18n/locales/de';
import en from '../../src/i18n/locales/en';
import es from '../../src/i18n/locales/es';
import fr from '../../src/i18n/locales/fr';
import hu from '../../src/i18n/locales/hu';
import it from '../../src/i18n/locales/it';
import ja from '../../src/i18n/locales/ja';
import nl from '../../src/i18n/locales/nl';
import pl from '../../src/i18n/locales/pl';
import pt from '../../src/i18n/locales/pt';
import ro from '../../src/i18n/locales/ro';
import sk from '../../src/i18n/locales/sk';
import sv from '../../src/i18n/locales/sv';
import tr from '../../src/i18n/locales/tr';
import uk from '../../src/i18n/locales/uk';
import zh from '../../src/i18n/locales/zh';
import type { Key } from '../../src/i18n/types';
import { EULA_NAME, EULA_URL, SITE, type Policy } from './site-text';
import { SUPPORT } from './support';

const out = process.argv[2];
if (!out) throw new Error('usage: gen-site.ts <out-dir>');

const BASE = 'https://tobob.github.io/kolorowanki-site/';
const DEFAULT: Lang = 'en';
/** Switcher order: English first (store reviewers), then Polish, then the rest as in the app. */
const ORDER: Lang[] = ['en', 'pl', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'uk', 'cs', 'sk', 'sv', 'ro', 'hu', 'tr', 'ja', 'zh'];
const STRINGS: Record<Lang, Record<Key, string>> = Object.fromEntries(
  Object.entries({ pl, en, de, fr, es, it, pt, nl, uk, cs, sk, sv, ro, hu, tr, ja, zh }).map(([l, v]) => [l, v.strings]),
) as Record<Lang, Record<Key, string>>;
/** Each language's own name (same as LANG_NAMES in src/i18n, which can't be imported outside the app). */
const NAMES: Record<Lang, string> = {
  en: 'English', pl: 'Polski', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano', pt: 'Português',
  nl: 'Nederlands', uk: 'Українська', cs: 'Čeština', sk: 'Slovenčina', sv: 'Svenska', ro: 'Română',
  hu: 'Magyar', tr: 'Türkçe', ja: '日本語', zh: '中文',
};
type Kind = 'support' | 'privacy' | 'terms';
const KINDS: Kind[] = ['support', 'privacy', 'terms'];
const REPO = 'https://github.com/tobob/kolorowanki';
const YEAR = 2026;

/** Path of a page relative to the site root, always ending with '/' (or '' for the root). */
const pathOf = (lang: Lang, kind: Kind) => (lang === DEFAULT ? '' : `${lang}/`) + (kind === 'support' ? '' : `${kind}/`);
/** Relative link from page `from` to page `to` (works on GitHub Pages and from a local folder). */
const rel = (from: string, to: string) => '../'.repeat(from.split('/').filter(Boolean).length) + to || './';

/** utm tag for links from this site to pastelki.club */
const PASTELKI_UTM = 'utm_source=kolorowanki&utm_medium=site';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Our own addresses (repo, issues, Pastelki, this site) become links. Runs on escaped text. */
const linkify = (html: string) =>
  html.replace(
    /(?:https?:\/\/)?(?:github\.com\/tobob\/kolorowanki(?:\/issues)?|pastelki\.club(?:\/[\w/#-]*)?|tobob\.github\.io\/kolorowanki-site\/[\w/-]*)/g,
    (m) => {
      const url = m.replace(/[.,]$/, '');
      const abs = url.startsWith('http') ? url : `https://${url}`;
      // links to Pastelki carry where the visit came from (Pastelki's visit log, Admin → Wizyty)
      const href = /pastelki\.club/.test(abs) && !abs.includes('#') ? `${abs}${abs.includes('?') ? '&' : '?'}${PASTELKI_UTM}` : abs;
      return `<a href="${href}">${url}</a>${m.slice(url.length)}`;
    },
  );
const rich = (lang: Lang, text: string) =>
  linkify(esc(text)).replace('{eula}', `<a href="${EULA_URL}">${esc(EULA_NAME[lang])}</a>`);
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);

const css = `
:root{--bg:#FFF8EC;--card:#fff;--text:#4B4453;--muted:#857C8C;--line:#EDE4D6;--accent:#3D7BC4;--chip:#F3EEFF}
@media (prefers-color-scheme:dark){:root{--bg:#1E1B22;--card:#29252E;--text:#EDE8F0;--muted:#A79FAE;--line:#3A3540;--accent:#8AB8F0;--chip:#332D3B}}
*{box-sizing:border-box}
body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Hiragino Sans","PingFang SC",sans-serif;background:var(--bg);color:var(--text);overflow-wrap:break-word}
a{color:var(--accent)}
.wrap{max-width:760px;margin:0 auto;padding:0 16px}
header{border-bottom:1px solid var(--line);background:var(--card)}
header .wrap{display:flex;flex-wrap:wrap;align-items:center;gap:8px 20px;padding-top:12px;padding-bottom:12px}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:19px;color:var(--text);text-decoration:none;margin-right:auto}
.brand img{width:32px;height:32px;border-radius:8px}
nav{display:flex;gap:16px;flex-wrap:wrap}
nav a{color:var(--muted);text-decoration:none;font-weight:500;padding:4px 0;border-bottom:2px solid transparent}
nav a[aria-current=page]{color:var(--text);border-color:var(--accent)}
details.lang{position:relative}
details.lang summary{cursor:pointer;list-style:none;color:var(--muted);font-size:14px;border:1px solid var(--line);border-radius:999px;padding:3px 12px}
details.lang summary::-webkit-details-marker{display:none}
details.lang ul{position:absolute;right:0;top:calc(100% + 6px);margin:0;padding:6px;list-style:none;background:var(--card);border:1px solid var(--line);border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.12);min-width:160px;max-height:70vh;overflow:auto;z-index:2}
details.lang li a{display:block;padding:6px 10px;border-radius:8px;text-decoration:none;color:var(--text)}
details.lang li a:hover{background:var(--chip)}
details.lang li a[aria-current=true]{font-weight:700}
main{padding:28px 0 48px}
h1{font-size:30px;line-height:1.2;margin:0 0 8px}
h2{font-size:20px;margin:28px 0 8px}
.hero{display:flex;gap:18px;align-items:center;margin-bottom:12px}
.hero img{width:84px;height:84px;border-radius:20px;box-shadow:0 4px 16px rgba(0,0,0,.12)}
.tagline{color:var(--muted);margin:0}
.chips{display:flex;flex-wrap:wrap;gap:8px;padding:0;margin:20px 0;list-style:none}
.chips li{background:var(--chip);border-radius:999px;padding:4px 12px;font-size:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:4px 22px 18px;margin:18px 0}
.faq dt{font-weight:600;margin-top:14px}
.faq dd{margin:2px 0 0}
.updated{color:var(--muted);font-size:14px}
.suggest{display:none;background:var(--chip);text-align:center;padding:8px 16px;font-size:14px}
footer{border-top:1px solid var(--line);color:var(--muted);font-size:14px;padding:18px 0 32px}
footer .wrap{display:flex;flex-wrap:wrap;gap:6px 18px}
footer a{color:var(--muted)}
`.replace(/\n/g, '');

function page(lang: Lang, kind: Kind, title: string, body: string): string {
  const here = pathOf(lang, kind);
  const t = SITE[lang];
  const link = (k: Kind) => rel(here, pathOf(lang, k));
  const navItem = (k: Kind) => `<a href="${link(k)}"${k === kind ? ' aria-current="page"' : ''}>${esc(t.nav[k])}</a>`;
  const langs = ORDER.map(
    (l) =>
      `<li><a href="${rel(here, pathOf(l, kind))}" hreflang="${SITE[l].code}" lang="${SITE[l].code}"${l === lang ? ' aria-current="true"' : ''}>${esc(NAMES[l])}</a></li>`,
  ).join('');
  const alternates =
    ORDER.map((l) => `<link rel="alternate" hreflang="${SITE[l].code}" href="${BASE}${pathOf(l, kind)}">`).join('') +
    `<link rel="alternate" hreflang="x-default" href="${BASE}${pathOf(DEFAULT, kind)}">`;
  // English pages only: offer (never force) the visitor's own language if we have it.
  const suggest =
    lang === DEFAULT
      ? `<div class="suggest" id="suggest"></div><script>(function(){var m=${JSON.stringify(
          Object.fromEntries(ORDER.filter((l) => l !== DEFAULT).map((l) => [l, [NAMES[l], rel(here, pathOf(l, kind))]])),
        )};var ls=navigator.languages||[navigator.language];for(var i=0;i<ls.length;i++){var c=(ls[i]||'').slice(0,2).toLowerCase();if(c==='en')return;if(m[c]){var e=document.getElementById('suggest');e.innerHTML='<a href="'+m[c][1]+'">'+m[c][0]+' &rarr;</a>';e.style.display='block';return;}}})();</script>`
      : '';
  return `<!doctype html><html lang="${t.code}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Kolorowanki</title><meta name="description" content="${esc(t.tagline)}">
<link rel="icon" href="${rel(here, 'favicon.png')}"><link rel="apple-touch-icon" href="${rel(here, 'icon.png')}">${alternates}<style>${css}</style></head><body>
${suggest}<header><div class="wrap"><a class="brand" href="${link('support')}"><img src="${rel(here, 'icon.png')}" alt="">Kolorowanki</a>
<nav>${KINDS.map(navItem).join('')}</nav>
<details class="lang"><summary>${esc(t.language)}: ${esc(NAMES[lang])} ▾</summary><ul>${langs}</ul></details></div></header>
<main><div class="wrap">${body}</div></main>
<footer><div class="wrap"><span>© ${YEAR} ${DEVELOPER} · ${esc(t.footer)}</span>${KINDS.map((k) => `<a href="${link(k)}">${esc(t.nav[k])}</a>`).join('')}<a href="${REPO}">GitHub</a></div></footer>
</body></html>
`;
}

function supportPage(lang: Lang): string {
  const s = SUPPORT[lang];
  const t = SITE[lang];
  const ui = STRINGS[lang];
  const here = pathOf(lang, 'support');
  const issuesLink = `<a href="https://${CONTACT}">${CONTACT}</a>`;
  const faq = s
    .faq(ui)
    .map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`)
    .join('');
  const about = [ui['about.body'], fill(ui['about.credit'], { pastelki: PASTELKI })].map((p) => `<p>${rich(lang, p)}</p>`).join('');
  const body = `<div class="hero"><img src="${rel(here, 'icon.png')}" alt=""><div><h1>Kolorowanki</h1><p class="tagline">${esc(t.tagline)}</p></div></div>
<ul class="chips">${t.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
<div class="card"><h2>${esc(s.aboutTitle)}</h2>${about}</div>
<div class="card"><h2>${esc(s.askTitle)}</h2><p>${esc(s.ask).replace('{link}', issuesLink)}</p></div>
<div class="card"><h2>${esc(s.faqTitle)}</h2><dl class="faq">${faq}</dl></div>
<p><a href="${rel(here, pathOf(lang, 'privacy'))}">${esc(s.privacy)}</a> · <a href="${rel(here, pathOf(lang, 'terms'))}">${esc(t.terms.title)}</a></p>`;
  return page(lang, 'support', s.title, body);
}

function policyPage(lang: Lang, kind: 'privacy' | 'terms', p: Policy, updated: string): string {
  const sections = p.sections.map((s) => `${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}<p>${rich(lang, s.body)}</p>`).join('');
  return page(lang, kind, p.title, `<h1>${esc(p.title)}</h1><p class="updated">${esc(updated)}</p><div class="card">${sections}</div>`);
}

/** English privacy page: the full policy from docs/PRIVACY.md (title, date, **bold** lead-ins, paragraphs). */
function englishPrivacy(): string {
  const md = readFileSync('docs/PRIVACY.md', 'utf8').split('\n');
  const updated = (md.find((l) => /^_Last updated/.test(l)) ?? '').replace(/_/g, '');
  const paras = md
    .filter((l) => l.trim() && !l.startsWith('#') && !/^_Last updated/.test(l) && l.trim() !== '---')
    .map((l) => `<p>${linkify(esc(l)).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`)
    .join('');
  const title = STRINGS.en['privacy.title'].replace(/^./, (c) => c.toUpperCase());
  return page('en', 'privacy', title, `<h1>${esc(title)}</h1><p class="updated">${esc(updated)}</p><div class="card">${paras}</div>`);
}

/** Other languages: the policy exactly as the app shows it; "full text" points to the English page. */
function appPrivacy(lang: Lang): Policy {
  const s = STRINGS[lang];
  const p5 = fill(s['privacy.p5'], { developer: DEVELOPER, contact: CONTACT, url: `${BASE}privacy/` });
  return {
    title: s['privacy.title'],
    sections: [s['privacy.p1'], s['privacy.p2'], s['privacy.p3'], s['privacy.photos'], s['privacy.feedback'], s['privacy.p4'], p5].map((body) => ({ body })),
  };
}

// Remove only what we generate (keeps .git, README etc.).
for (const l of ORDER) if (l !== DEFAULT) rmSync(`${out}/${l}`, { recursive: true, force: true });
for (const k of ['privacy', 'terms']) rmSync(`${out}/${k}`, { recursive: true, force: true });

const write = (path: string, html: string) => {
  mkdirSync(`${out}/${path}`, { recursive: true });
  writeFileSync(`${out}/${path}index.html`, html);
};
for (const lang of ORDER) {
  write(pathOf(lang, 'support'), supportPage(lang));
  write(pathOf(lang, 'privacy'), lang === DEFAULT ? englishPrivacy() : policyPage(lang, 'privacy', appPrivacy(lang), SITE[lang].updated));
  write(pathOf(lang, 'terms'), policyPage(lang, 'terms', SITE[lang].terms, SITE[lang].updated));
}
// 256 px icon is plenty for the site (the 1024 px original is ~1 MB); fall back to a copy without sips.
try {
  execFileSync('sips', ['-Z', '256', 'docs/images/icon.png', '--out', `${out}/icon.png`], { stdio: 'ignore' });
} catch {
  copyFileSync('docs/images/icon.png', `${out}/icon.png`);
}
copyFileSync('assets/images/favicon.png', `${out}/favicon.png`);
if (!existsSync(`${out}/.nojekyll`)) writeFileSync(`${out}/.nojekyll`, '');
console.log(`ok: ${ORDER.length * KINDS.length} pages`);
