import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../src/components/ui/Card';

describe('Card Component Suite (<Card />)', () => {
  it('renders card with all nested sections', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Bovine Health Summary</CardTitle>
          <CardDescription>Overview of herd status and monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Normal vital signs observed across all 12 cattle.</p>
        </CardContent>
        <CardFooter>
          <button>View Full Report</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Bovine Health Summary')).toBeInTheDocument();
    expect(screen.getByText('Overview of herd status and monitoring')).toBeInTheDocument();
    expect(screen.getByText('Normal vital signs observed across all 12 cattle.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view full report/i })).toBeInTheDocument();
  });

  it('merges custom classNames properly on Card', () => {
    render(<Card className="custom-card-shadow" data-testid="test-card">Content</Card>);
    const card = screen.getByTestId('test-card');
    expect(card).toHaveClass('custom-card-shadow');
    expect(card).toHaveClass('rounded-xl');
  });
});
