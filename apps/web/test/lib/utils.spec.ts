import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDateTime } from '../../src/lib/utils';

describe('Web Utility Functions (lib/utils.ts)', () => {
  describe('cn (Class Names Merger)', () => {
    it('merges class names correctly', () => {
      expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
    });

    it('resolves conflicting tailwind classes cleanly', () => {
      expect(cn('p-4', 'p-2')).toBe('p-2');
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
    });

    it('handles conditional class logic and falsy values', () => {
      const isHidden = false;
      const isVisible = true;
      expect(cn('base', isHidden && 'hidden', isVisible && 'block', null, undefined)).toBe('base block');
    });
  });

  describe('formatDate', () => {
    it('formats valid ISO date string properly', () => {
      const date = '2026-10-27T10:00:00Z';
      const formatted = formatDate(date);
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Oct');
    });

    it('returns "N/A" for null or undefined input', () => {
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
    });
  });

  describe('formatDateTime', () => {
    it('formats date and time string properly', () => {
      const date = '2026-10-27T10:30:00Z';
      const formatted = formatDateTime(date);
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Oct');
    });

    it('returns "N/A" for null or undefined input', () => {
      expect(formatDateTime(null)).toBe('N/A');
      expect(formatDateTime(undefined)).toBe('N/A');
    });
  });
});
