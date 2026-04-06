import React from 'react';
import {
  ChartBar,
  ChatsCircle,
  Envelope,
  Image,
  Link,
  Tag,
  Users,
  X,
} from '@phosphor-icons/react';
import type { BlockType } from '@shared';
import OverlayModal from './OverlayModal';

interface BlockMeta {
  label: string;
  description: string;
  icon: React.ElementType;
}

const BLOCK_META: Record<BlockType, BlockMeta> = {
  about: { label: 'Sobre mí', description: 'Bio, foto principal y hashtags de tu nicho', icon: Users },
  metrics: { label: 'Métricas', description: 'Seguidores, engagement, audiencia y distribución geográfica', icon: ChartBar },
  portfolio: { label: 'Portfolio', description: 'Galería de imágenes de tu trabajo', icon: Image },
  brands: { label: 'Marcas', description: 'Clientes y marcas con las que has trabajado', icon: ChatsCircle },
  services: { label: 'Servicios', description: 'Tarifas y paquetes de colaboración', icon: Tag },
  closing: { label: 'Cierre', description: 'CTA final y texto de footer', icon: Envelope },
  // Phase 2 blocks — not yet in picker
  testimonials: { label: 'Testimoniales', description: 'Opiniones de clientes y colaboradores', icon: Tag },
  press: { label: 'Prensa', description: 'Menciones y apariciones en medios', icon: Tag },
  speaking_topics: { label: 'Temas de conferencia', description: 'Temas y charlas que ofreces', icon: Tag },
  video_reel: { label: 'Reel / Video', description: 'Videos y contenido audiovisual destacado', icon: Tag },
  equipment: { label: 'Equipo / Gear', description: 'Herramientas y equipo que utilizas', icon: Tag },
  awards: { label: 'Premios', description: 'Reconocimientos y certificaciones', icon: Tag },
  faq: { label: 'FAQ', description: 'Preguntas frecuentes sobre tu trabajo', icon: Tag },
  episodes: { label: 'Episodios', description: 'Episodios destacados de tu podcast', icon: Tag },
  releases: { label: 'Lanzamientos', description: 'Releases y lanzamientos musicales', icon: Tag },
  links: { label: 'Links', description: 'Lista de enlaces — ideal para bio de Instagram', icon: Link },
};

const AVAILABLE_BLOCKS: BlockType[] = ['about', 'metrics', 'portfolio', 'brands', 'services', 'closing', 'links'];

interface BlockPickerDrawerProps {
  enabledBlocks: BlockType[];
  accentHex: string;
  onAdd: (type: BlockType) => void;
  onClose: () => void;
}

export default function BlockPickerDrawer({ enabledBlocks, accentHex, onAdd, onClose }: BlockPickerDrawerProps) {
  const available = AVAILABLE_BLOCKS.filter((type) => !enabledBlocks.includes(type));

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
            <h2 className="text-base font-bold text-[var(--text-primary)]">Agregar bloque</h2>
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
          {available.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--text-secondary)]">
              Ya tienes todos los bloques disponibles agregados.
            </p>
          ) : (
            <div className="grid gap-2">
              {available.map((type) => {
                const meta = BLOCK_META[type];
                const Icon = meta.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { onAdd(type); onClose(); }}
                    className="flex w-full items-center gap-4 rounded-[1rem] border border-[var(--line-soft)] bg-[var(--surface-card)] px-4 py-3.5 text-left transition-all hover:border-[var(--accent)] hover:bg-[var(--surface-muted)] active:scale-[0.99]"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${accentHex}18`, color: accentHex }}
                    >
                      <Icon size={16} weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)]">{meta.label}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{meta.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </OverlayModal>
  );
}
