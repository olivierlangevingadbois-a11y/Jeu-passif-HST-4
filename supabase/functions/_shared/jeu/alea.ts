// Générateurs de hasard.
import type { Alea } from './archives.ts';

/** Hasard cryptographique : utilisé par le serveur pour les paquets et les récompenses. */
export function aleaCrypto(): Alea {
  return () => {
    const tampon = new Uint32Array(1);
    crypto.getRandomValues(tampon);
    return tampon[0] / 4294967296;
  };
}

/** Hasard reproductible (tests, simulateur). */
export function aleaGraine(graine: number): Alea {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
