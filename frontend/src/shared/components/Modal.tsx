import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div
        className={`overlay-box${wide ? ' overlay-wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {title && <h2 className="overlay-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
