import { describe, it, expect } from 'vitest';
import { Vector, hexToRgba, randomInt } from './utils';

describe('Vector utilities', () => {
  it('should correctly add two vectors', () => {
    const v1 = { x: 1, y: 2 };
    const v2 = { x: 3, y: 4 };
    expect(Vector.add(v1, v2)).toEqual({ x: 4, y: 6 });
  });

  it('should correctly subtract two vectors', () => {
    const v1 = { x: 5, y: 5 };
    const v2 = { x: 2, y: 3 };
    expect(Vector.sub(v1, v2)).toEqual({ x: 3, y: 2 });
  });

  it('should calculate the distance between two vectors', () => {
    const v1 = { x: 0, y: 0 };
    const v2 = { x: 3, y: 4 };
    expect(Vector.distance(v1, v2)).toBe(5);
  });
});

describe('Color utilities', () => {
  it('hexToRgba should convert hex color to rgba string', () => {
    expect(hexToRgba('#2eb886', 0.55)).toBe('rgba(46,184,134,0.55)');
    expect(hexToRgba('#FFFFFF', 1)).toBe('rgba(255,255,255,1)');
    expect(hexToRgba('#000000', 0)).toBe('rgba(0,0,0,0)');
  });
});

describe('Random utilities', () => {
  it('randomInt should return integer within range', () => {
    const min = 1;
    const max = 5;
    for (let i = 0; i < 100; i++) {
      const val = randomInt(min, max);
      expect(val).toBeGreaterThanOrEqual(min);
      expect(val).toBeLessThanOrEqual(max);
      expect(Number.isInteger(val)).toBe(true);
    }
  });
});
