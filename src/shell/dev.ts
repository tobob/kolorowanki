/**
 * DEV-ONLY screenshot hook (no effect in release: everything is behind __DEV__), as in Pasujki.
 * A one-shot route in kv-store key `kolorowanki.dev`, written from the host with sqlite3 into the
 * simulator's app container while the app is closed, opens a screen without UI automation:
 *   sqlite3 <container>/Documents/SQLite/ExpoSQLiteStorage \
 *     "INSERT OR REPLACE INTO storage VALUES ('kolorowanki.dev','/tutorial?step=2')"
 */
import Storage from 'expo-sqlite/kv-store';

export function takeDevRoute(): string | null {
  if (!__DEV__) return null;
  try {
    const route = Storage.getItemSync('kolorowanki.dev');
    if (route) Storage.removeItemSync('kolorowanki.dev');
    return route && route.startsWith('/') ? route : null;
  } catch {
    return null;
  }
}
