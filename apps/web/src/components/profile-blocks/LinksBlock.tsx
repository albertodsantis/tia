import React from 'react';
import { Plus, Trash } from '@phosphor-icons/react';
import type { MediaKitLink, MediaKitProfile } from '@shared';
import { fieldClass, labelClass, safeArr } from './block-styles';

interface LinksBlockProps {
  mediaKit: Pick<MediaKitProfile, 'links'>;
  accentHex: string;
  onLinkChange: (index: number, field: keyof MediaKitLink, value: string) => void;
  onAddLink: () => void;
  onRemoveLink: (index: number) => void;
}

export default function LinksBlock({
  mediaKit,
  accentHex,
  onLinkChange,
  onAddLink,
  onRemoveLink,
}: LinksBlockProps) {
  return (
    <div className="grid gap-3">
      {safeArr(mediaKit.links).map((link: any, index: number) => (
        <div
          key={index}
          className="group relative grid gap-3 rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-muted)] p-4 sm:grid-cols-2"
        >
          <button
            type="button"
            onClick={() => onRemoveLink(index)}
            className="absolute right-3 top-3 text-[var(--text-secondary)] opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
          >
            <Trash size={14} />
          </button>
          <div>
            <label className={labelClass}>Etiqueta</label>
            <input
              value={link?.label || ''}
              onChange={(e) => onLinkChange(index, 'label', e.target.value)}
              className={fieldClass}
              style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
              placeholder="Mi Instagram"
            />
          </div>
          <div>
            <label className={labelClass}>URL</label>
            <input
              value={link?.url || ''}
              onChange={(e) => onLinkChange(index, 'url', e.target.value)}
              className={fieldClass}
              style={{ '--tw-ring-color': accentHex } as React.CSSProperties}
              placeholder="https://..."
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={onAddLink}
        className="flex min-h-[56px] items-center justify-center gap-2 rounded-[1rem] border border-dashed border-[var(--line-soft)] bg-[var(--surface-card)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
      >
        <Plus size={16} weight="regular" />
        <span className="text-sm font-bold">Añadir link</span>
      </button>
    </div>
  );
}
