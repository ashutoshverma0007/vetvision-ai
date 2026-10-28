import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '../../src/components/ui/Alert';

describe('Alert Component (<Alert />)', () => {
  it('renders alert container with role="alert"', () => {
    render(
      <Alert>
        <AlertTitle>Notice</AlertTitle>
        <AlertDescription>System maintenance scheduled</AlertDescription>
      </Alert>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Notice')).toBeInTheDocument();
    expect(screen.getByText('System maintenance scheduled')).toBeInTheDocument();
  });

  it('renders info variant by default with blue styling', () => {
    render(<Alert>Default Info</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('text-blue-900');
  });

  it('renders success variant with emerald styling', () => {
    render(<Alert variant="success">Saved successfully</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('text-emerald-900');
  });

  it('renders warning variant with amber styling', () => {
    render(<Alert variant="warning">Low stock warning</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('text-amber-900');
  });

  it('renders destructive variant with red styling', () => {
    render(<Alert variant="destructive">Error loading data</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('text-red-900');
  });

  it('renders icon inside alert component', () => {
    render(<Alert variant="destructive">Critical Error</Alert>);
    const alert = screen.getByRole('alert');
    const svgIcon = alert.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
  });
});
