// Mise en forme des nombres et des durées, en français.

const entier = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('fr-CA', { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat('fr-CA', { notation: 'compact', maximumFractionDigits: 2 });

/** 1 234 ; 12,5 ; 3,4 M */
export function nombre(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const a = Math.abs(n);
  if (a >= 100_000) return compact.format(n);
  if (a >= 100) return entier.format(Math.floor(n));
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
