import React from 'react';
import { X } from '@phosphor-icons/react';
import type { BlockType } from '@shared';
import OverlayModal from './OverlayModal';
import { BLOCK_TEMPLATES } from '../lib/blockTemplates';

const BLOCK_LABELS: Record<BlockType, string> = {
  about:           'Sobre mí',
  metrics:         'Métricas',
  portfolio:       'Portfolio',
  brands:          'Marcas',
  services:        'Servicios',
  closing:         'Cierre',
  testimonials:    'Testimoniales',
  press:           'Prensa',
  speaking_topics: 'Temas de conferencia',
  video_reel:      'Reel / Video',
  equipment:       'Equipo',
  awards:          'Premios',
  faq:             'FAQ',
  episodes:        'Episodios',
  releases:        'Lanzamientos',
  links:           'Links',
};

interface TemplatePickerDrawerProps {
  accentHex: string;
  onApply: (blocks: BlockType[]) => void;
  onClose: () => void;
}

export default function TemplatePickerDrawer({ accentHex, onApply, onClose }: TemplatePickerDrawerProps) {
  return (
    <OverlayModal onClose={onClose}>
      <div
        className="relative mx-auto w-full max-w-lg rounded-t-[1.5rem] border border-[var(--line-soft)] bg-[var(--surface-card-strong)] shadow-[var(--shadow-floating)] sm:rounded-[1.5rem]"
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-6 py-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--text-secondary)]/80 uppercase">
              Tu perfil
            </p>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Elegir plantilla</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            Las plantillas configuran qué bloques aparecen en tu perfil. Puedes agregar o quitar bloques después.
          </p>
          <div className="grid gap-3">
            {BLOCK_TEMPLATES.map((template) => (
              <button
                key={template.key}
                type="button"
                onClick={() => { onApply(template.blocks); onClose(); }}
                className="w-full rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-card)] p-4 text-left transition-all hover:border-[var(--accent)] hover:bg-[var(--surface-muted)] active:scale-[0.99]"
              >
                <p className="text-sm font-bold text-[var(--text-primary)]">{template.label}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{template.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {template.blocks.map((type) => (
                    <span
                      key={type}
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                      style={{ backgroundColor: `${accentHex}14`, color: accentHex }}
                    >
                      {BLOCK_LABELS[type]}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </OverlayModal>
  );
}
