/**
 * Prints Edyta's tutorial lines (i18n keys edyta.<line>) for every language as JSON:
 *   npx tsx tools/voice/lines.ts > lines.json      →  { "pl": { "tray": "…", "trayOk": "…", … }, "en": {…}, … }
 * Keys are listed in rendering priority (instructions first, then praise, then hints).
 * The locale files are the single source of truth: the same text is the speech bubble and the voice.
 */
import { EDYTA_LINES } from '../../src/audio/edyta-lines';
import { LANGS } from '../../src/coloring/types';
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

const ALL = { pl, en, de, fr, es, it, pt, nl, uk, cs, sk, sv, ro, hu, tr, ja, zh };
const out = Object.fromEntries(LANGS.map((l) => [l, Object.fromEntries(EDYTA_LINES.map((k) => [k, ALL[l].strings[`edyta.${k}`]]))]));
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
