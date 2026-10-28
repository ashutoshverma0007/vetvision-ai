import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../../src/components/ui/Badge';

describe('Badge Component (<Badge />)', () => {
  it('renders badge text content correctly', () => {
    render(<Badge>Verified</Badge>);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders default variant classes', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('bg-primary/10');
  });

  it('renders success variant with emerald styling', () => {
    render(<Badge variant="success">Active</Badge>);
    const badge = screen.getByText('Active');
    expect(badge).toHaveClass('text-emerald-700');
  });

  it('renders destructive variant with red styling', () => {
    render(<Badge variant="destructive">Severe</Badge>);
    const badge = screen.getByText('Severe');
    expect(badge).toHaveClass('text-red-700');
  });

  it('renders warning variant with amber styling', () => {
    render(<Badge variant="warning">Moderate</Badge>);
    const badge = screen.getByText('Moderate');
    expect(badge).toHaveClass('text-amber-700');
  });

  it('renders info variant with blue styling', () => {
    render(<Badge variant="info">In Review</Badge>);
    const badge = screen.getByText('In Review');
    expect(badge).toHaveClass('text-blue-700');
  });

  it('merges custom className when passed', () => {
    render(<Badge className="custom-test-class">Custom</Badge>);
    const badge = screen.getByText('Custom');
    expect(badge).toHaveClass('custom-test-class');
  });
});
