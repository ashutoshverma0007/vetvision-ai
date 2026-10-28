import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from '../../src/components/layout/Footer';

describe('Footer Component (<Footer />)', () => {
  it('renders clinical safety disclaimer banner', () => {
    render(<Footer />);

    expect(screen.getByText(/Clinical Safety Disclaimer:/i)).toBeInTheDocument();
    expect(screen.getByText(/does not constitute definitive veterinary diagnosis/i)).toBeInTheDocument();
  });

  it('renders copyright and architecture principles', () => {
    render(<Footer />);

    const brandOccurrences = screen.getAllByText(/VetVision AI/i);
    expect(brandOccurrences.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Strictly Non-Hallucinatory Architecture/i)).toBeInTheDocument();
  });

  it('renders links to research protocol and screening guidelines', () => {
    render(<Footer />);

    const researchLink = screen.getByRole('link', { name: /research protocol/i });
    expect(researchLink).toHaveAttribute('href', '/about');

    const guidelinesLink = screen.getByRole('link', { name: /screening guidelines/i });
    expect(guidelinesLink).toHaveAttribute('href', '/how-it-works');
  });
});
