import type { BlockType } from '@shared';

export interface BlockTemplate {
  key: string;
  label: string;
  description: string;
  blocks: BlockType[];
}

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    key: 'content_creator',
    label: 'Creador de contenido',
    description: 'Para influencers y creadores: métricas, portfolio, marcas y tarifas.',
    blocks: ['about', 'metrics', 'portfolio', 'brands', 'services', 'closing'],
  },
  {
    key: 'link_in_bio',
    label: 'Link en Bio',
    description: 'Página simple con tus links esenciales — ideal para la bio de Instagram.',
    blocks: ['links'],
  },
];
