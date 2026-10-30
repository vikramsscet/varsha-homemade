import { describe, expect, it } from 'vitest';
import { formatCurrency } from './currency';

describe('formatCurrency', () => {
  it('formats INR amounts in the app style', () => {
    expect(formatCurrency(250)).toBe('₹250.00');
    expect(formatCurrency(745.5)).toBe('₹745.50');
    expect(formatCurrency(0)).toBe('₹0.00');
  });

  it('handles missing or invalid amounts without computing anything', () => {
    for (const v of [undefined, null, 'x', NaN, Infinity]) expect(formatCurrency(v)).toBe('—');
  });

  it('falls back safely for an unknown currency code', () => {
    expect(formatCurrency(10, 'NOPE!')).toBe('₹10.00');
  });
});
