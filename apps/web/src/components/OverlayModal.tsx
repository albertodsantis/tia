import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function OverlayModal({
  children,
  tone = 'black',
  onClose,
}: {
  children: React.ReactNode;
  tone?: 'black' | 'slate';
  onClose?: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Restore focus to the element that was focused before the modal opened
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => {
      previouslyFocused?.focus();
    };
  }, []);

  // Move initial focus into the modal (once on mount)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusableSelectors =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const firstFocusable = dialog.querySelector<HTMLElement>(focusableSelectors);
    firstFocusable?.focus();
  }, []);

  // Focus trap: constrain Tab/Shift+Tab to focusable elements inside the modal
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableSelectors =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
        (el) => !el.closest('[inert]'),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[120] flex items-end justify-center px-0 backdrop-blur-md animate-in fade-in duration-200 sm:items-center sm:px-6 ${
        tone === 'slate'
          ? 'bg-[rgba(35,27,22,0.28)] dark:bg-[rgba(8,6,5,0.7)]'
          : 'bg-[rgba(41,31,24,0.24)] dark:bg-[rgba(8,6,5,0.64)]'
      }`}
      onClick={() => onClose?.()}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-[-8rem] top-[-10rem] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(201,111,91,0.16),transparent_68%)]" />
        <div className="absolute bottom-[-10rem] left-[-7rem] h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(93,141,123,0.12),transparent_68%)]" />
      </div>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="pointer-events-auto relative flex w-full justify-center pb-[env(safe-area-inset-bottom,0px)] sm:w-auto sm:max-w-[min(960px,100%)] sm:pb-0"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center sm:hidden">
          <span className="h-1.5 w-12 rounded-full bg-[var(--line-strong)]" />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
