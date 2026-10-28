import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../../src/context/ThemeContext';
import { ThemeToggle } from '../../src/components/ui/ThemeToggle';

describe('ThemeToggle Component (<ThemeToggle />)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renders quick toggle button variant by default', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /switch to/i });
    expect(button).toBeInTheDocument();
  });

  it('toggles theme on click in button mode', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /switch to/i });
    fireEvent.click(button);
    expect(localStorage.getItem('vetvision_theme')).toBe('dark');

    fireEvent.click(button);
    expect(localStorage.getItem('vetvision_theme')).toBe('light');
  });

  it('renders dropdown variant and displays options when clicked', () => {
    render(
      <ThemeProvider>
        <ThemeToggle variant="dropdown" />
      </ThemeProvider>
    );

    const trigger = screen.getByRole('button', { name: /select color theme/i });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /system/i })).toBeInTheDocument();

    // Select dark theme
    fireEvent.click(screen.getByRole('button', { name: /dark/i }));
    expect(localStorage.getItem('vetvision_theme')).toBe('dark');
  });
});
