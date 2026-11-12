import { describe, expect, it } from 'vitest';
import { duree, nombre } from '../app/src/lib/format.ts';

const espace = /[\s  ]/g;
const n = (x: number) => nombre(x).replace(espace, ' ');

describe('format', () => {
  it('écrit les nombres à la française', () => {
    expect(n(12.56)).toBe('12,5');
    expect(n(0.05)).toBe('0,05');
    expect(n(1234)).toBe('1 234');
    expect(n(1_500_000)).toBe('1,5 million');
    expect(n(2_000_000_000)).toBe('2 milliards');
    expect(n(6e12)).toBe('6 billions');
  });
  it('écrit les durées', () => {
    expect(duree(45)).toBe('45 s');
    expect(duree(270)).toBe('4 min 30 s');
    expect(duree(3 * 3600 + 5 * 60)).toBe('3 h 05 min');
  });
});
