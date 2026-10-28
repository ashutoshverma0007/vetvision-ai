import { afterEach, vi } from 'vitest';

if (typeof window !== 'undefined') {
  // Dynamically import DOM-specific matchers and cleanup when running in a DOM environment
  import('@testing-library/jest-dom/vitest');
  const { cleanup } = await import('@testing-library/react');

  afterEach(() => {
    cleanup();
  });

  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });
  }

  if (!window.scrollTo) {
    window.scrollTo = vi.fn();
  }
}
