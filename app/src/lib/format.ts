// Mise en forme des nombres et des durées, en français.

const entier = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 1 });
const deuxDecimales = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 2 });

// Grands nombres en mots, à la française : un billion = mille milliards.
const ECHELLES: [number, string, string][] = [
  [1e15, 'billiard', 'billiards'],
  [1e12, 'billion', 'billions'],
  [1e9, 'milliard', 'milliards'],
  [1e6, 'million', 'millions'],
];

/** 1 234 ; 12,5 ; 3,4 millions ; 2,1 milliards */
export function nombre(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const a = Math.abs(n);
  if (a >= 1e18) return n.toExponential(2).replace('.', ',').replace('e+', ' × 10^');
  for (const [valeur, un, plusieurs] of ECHELLES) {
    if (a >= valeur) {
      const x = n / valeur;
      return `${deuxDecimales.format(Math.floor(x * 100) / 100)} ${Math.abs(x) >= 2 ? plusieurs : un}`;
    }
  }
  if (a >= 100) return entier.format(Math.floor(n));
  if (a > 0 && a < 1) return deuxDecimales.format(Math.floor(n * 100) / 100);
  return decimal.format(Math.floor(n * 10) / 10);
}

export function parSeconde(n: number): string {
  return `${nombre(n)}/s`;
}

export function pourcentage(x: number): string {
  return `${decimal.format(Math.round(x * 1000) / 10)} %`;
}

/** 2 h 05 min ; 4 min 30 s ; 12 s */
export function duree(secondes: number): string {
  const s = Math.max(0, Math.round(secondes));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  if (m > 0) return r ? `${m} min ${String(r).padStart(2, '0')} s` : `${m} min`;
  return `${r} s`;
}

export function multiplicateur(x: number): string {
  return `×${decimal.format(Math.round(x * 100) / 100)}`;
}
