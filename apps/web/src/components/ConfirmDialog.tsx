import React from 'react';
import OverlayModal from './OverlayModal';
import { Button, ModalPanel } from './ui';

export default function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
  isConfirming = false,
  tone = 'danger',
  accentColor,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  isConfirming?: boolean;
  tone?: 'primary' | 'danger';
  accentColor?: string;
}) {
  return (
    <OverlayModal tone="slate" onClose={onClose}>
      <ModalPanel
        title={title}
        onClose={onClose}
        size="sm"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button tone="secondary" onClick={onClose} className="sm:min-w-[9rem]">
              {cancelLabel}
            </Button>
            <Button
              tone={tone}
              accentColor={tone === 'primary' ? accentColor : undefined}
              onClick={onConfirm}
              disabled={isConfirming}
              className="sm:min-w-[9rem]"
            >
              {isConfirming ? 'Procesando…' : confirmLabel}
            </Button>
          </div>
        }
      >
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      </ModalPanel>
    </OverlayModal>
  );
}
