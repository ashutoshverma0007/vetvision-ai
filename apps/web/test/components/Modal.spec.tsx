import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../src/components/ui/Modal';

describe('Modal Component (<Modal />)', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Dialog">
        <p>Modal body content</p>
      </Modal>
    );

    expect(screen.queryByText('Test Dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal body content')).not.toBeInTheDocument();
  });

  it('renders title, description and children when isOpen is true', () => {
    render(
      <Modal
        isOpen={true}
        onClose={vi.fn()}
        title="Schedule Consultation"
        description="Choose a date and time for the veterinary appointment."
      >
        <p>Form fields go here</p>
      </Modal>
    );

    expect(screen.getByText('Schedule Consultation')).toBeInTheDocument();
    expect(screen.getByText('Choose a date and time for the veterinary appointment.')).toBeInTheDocument();
    expect(screen.getByText('Form fields go here')).toBeInTheDocument();
  });

  it('calls onClose when close (X) button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Closeable Modal">
        <p>Content</p>
      </Modal>
    );

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Escape Modal">
        <p>Content</p>
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll when open and restores when unmounted', () => {
    const { unmount } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Scroll Lock Test">
        <p>Content</p>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('unset');
  });
});
