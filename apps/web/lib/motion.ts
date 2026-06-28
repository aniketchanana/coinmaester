import type { CSSProperties } from 'react';

const STAGGER_BASE_MS = 35;
const STAGGER_MAX_MS = 350;

export function staggerDelay(index: number): CSSProperties {
  return {
    animationDelay: `${Math.min(index * STAGGER_BASE_MS, STAGGER_MAX_MS)}ms`,
    animationFillMode: 'both',
  };
}

export const ROW_ENTER_CLASS =
  'animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none';

export const EMPTY_STATE_ENTER_CLASS =
  'animate-in fade-in-0 zoom-in-95 duration-500 motion-reduce:animate-none';

export const REVEAL_UP_CLASS =
  'animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none';
