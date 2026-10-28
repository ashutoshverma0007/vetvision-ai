import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../../src/components/ui/Input';

describe('Input Component (<Input />)', () => {
  it('renders input with label and placeholder', () => {
    render(<Input label="Animal Name" placeholder="e.g. Bella" name="name" />);
    
    expect(screen.getByLabelText(/animal name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Bella')).toBeInTheDocument();
  });

  it('updates value and calls onChange handler on typing', () => {
    const handleChange = vi.fn();
    render(<Input label="Tag Number" onChange={handleChange} />);
    
    const input = screen.getByLabelText(/tag number/i);
    fireEvent.change(input, { target: { value: 'COW-9842' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect((input as HTMLInputElement).value).toBe('COW-9842');
  });

  it('displays error message and applies red border styles when error prop is passed', () => {
    render(<Input label="Microchip ID" error="Microchip format is invalid" />);
    
    expect(screen.getByText('Microchip format is invalid')).toBeInTheDocument();
    const input = screen.getByLabelText(/microchip id/i);
    expect(input).toHaveClass('border-red-500');
  });

  it('displays helperText when provided and no error exists', () => {
    render(<Input label="Birth Date" helperText="Approximate date is acceptable" />);
    
    expect(screen.getByText('Approximate date is acceptable')).toBeInTheDocument();
  });

  it('disables input when disabled prop is true', () => {
    render(<Input label="Locked Field" disabled />);
    
    const input = screen.getByLabelText(/locked field/i);
    expect(input).toBeDisabled();
  });
});
