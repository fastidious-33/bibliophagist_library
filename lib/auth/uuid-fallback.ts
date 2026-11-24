/**
 * Neon Auth's browser library calls crypto.randomUUID() as soon as it
 * loads, to label the browser tab. Browsers only offer randomUUID on secure
 * pages (https, or localhost), so opening the dev server from a phone at
 * http://192.168.x.x crashed every page. This fills it in, only where it's
 * missing, from crypto.getRandomValues (which plain http does allow). On
 * https and localhost it does nothing.
 *
 * Imported by lib/auth/client.ts before @neon/auth, so it runs first.
 */
const webCrypto = typeof globalThis === 'undefined' ? undefined : globalThis.crypto;

if (webCrypto && typeof webCrypto.randomUUID !== 'function' && typeof webCrypto.getRandomValues === 'function') {
  // A version 4 UUID, as randomUUID makes.
  const randomUUID = () => {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
  Object.defineProperty(webCrypto, 'randomUUID', { value: randomUUID, configurable: true, writable: true });
}

export {};
